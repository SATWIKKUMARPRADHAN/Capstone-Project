import type { Server as SocketIOServer } from 'socket.io';
import { labStore } from './store.ts';
import type { Incident, IssueReport, RecoveryLog, Workstation } from './types.ts';

export type FaultKind =
  | 'EXAM_SERVICE_STOPPED'
  | 'CPU_SATURATION'
  | 'DISK_CRITICAL'
  | 'NETWORK_LOSS'
  | 'PUPPET_DRIFT'
  | 'HARDWARE_FAULT';

interface PlaybookMapping {
  playbook: string | null;
  probableCause: string;
  severity: 'warning' | 'critical';
}

const FAULT_PLAYBOOK_MAP: Record<FaultKind, PlaybookMapping> = {
  EXAM_SERVICE_STOPPED: {
    playbook: 'restart_exam_service.yml',
    probableCause: 'LabGuardExamService process crashed or HTTP /api/exam/health returned 503',
    severity: 'critical',
  },
  CPU_SATURATION: {
    playbook: 'recover_high_cpu.yml',
    probableCause: 'Runaway background updater process consuming >90% CPU during active exam',
    severity: 'warning',
  },
  DISK_CRITICAL: {
    playbook: 'cleanup_disk.yml',
    probableCause: 'System C: drive temp & browser cache exceeded 90% disk capacity',
    severity: 'warning',
  },
  NETWORK_LOSS: {
    playbook: 'reset_network_adapter.yml',
    probableCause: 'DHCP lease expired or stale DNS cache preventing exam server reachability',
    severity: 'critical',
  },
  PUPPET_DRIFT: {
    playbook: 'restore_exam_kiosk.yml',
    probableCause: 'Puppet detected unauthorized modification to exam-kiosk.json or firewall rules',
    severity: 'warning',
  },
  HARDWARE_FAULT: {
    playbook: null,
    probableCause: 'Physical peripheral or display/power fault requiring technician dispatch',
    severity: 'critical',
  },
};

export function mapReportCategoryToFault(category: IssueReport['category']): FaultKind {
  switch (category) {
    case 'Exam App Frozen':
      return 'EXAM_SERVICE_STOPPED';
    case 'Network Disconnected':
      return 'NETWORK_LOSS';
    case 'High Lag / Slow PC':
      return 'CPU_SATURATION';
    case 'Disk Full Warning':
      return 'DISK_CRITICAL';
    case 'Keyboard / Mouse Hardware':
    case 'Display / Power Issue':
    default:
      return 'HARDWARE_FAULT';
  }
}

export class RecoveryOrchestrator {
  private io: SocketIOServer | null = null;

  attachSocket(io: SocketIOServer): void {
    this.io = io;
  }

  private broadcastState(): void {
    if (this.io) {
      this.io.emit('lab:state', labStore.getSnapshot());
    }
  }

  injectFault(
    workstationId: string,
    faultType: FaultKind,
    source: Incident['source'] = 'nagios',
    autoRecover = true
  ): { incident: Incident; workstation: Workstation } {
    const ws = labStore.getWorkstation(workstationId);
    if (!ws) {
      throw new Error(`Workstation ${workstationId} not found`);
    }

    const mapping = FAULT_PLAYBOOK_MAP[faultType];

    // Apply realistic telemetry & service state degradation
    const wsPatch: Partial<Workstation> = {
      status: mapping.severity === 'critical' ? 'failed' : 'degraded',
    };
    if (faultType === 'EXAM_SERVICE_STOPPED') {
      wsPatch.examServiceStatus = 'stopped';
      wsPatch.examLatencyMs = 0;
      if (workstationId === 'WS-LAB1-01') {
        labStore.setExamGlobalHealthy(false);
      }
    } else if (faultType === 'CPU_SATURATION') {
      wsPatch.cpuPercent = 94.8;
      wsPatch.memoryPercent = Math.max(ws.memoryPercent, 84);
      wsPatch.examLatencyMs = 390;
    } else if (faultType === 'DISK_CRITICAL') {
      wsPatch.diskPercent = 94.2;
      wsPatch.examLatencyMs = 165;
    } else if (faultType === 'NETWORK_LOSS') {
      wsPatch.examServiceStatus = 'error';
      wsPatch.examLatencyMs = 999;
    } else if (faultType === 'PUPPET_DRIFT') {
      wsPatch.puppetConfigStatus = 'drifted';
    }

    const updatedWs = labStore.updateWorkstation(workstationId, wsPatch)!;

    // Record metric point for ML anomaly engine
    labStore.addMetricLog({
      workstationId,
      timestamp: new Date().toISOString(),
      cpuPercent: updatedWs.cpuPercent,
      memoryPercent: updatedWs.memoryPercent,
      diskPercent: updatedWs.diskPercent,
      examLatencyMs: updatedWs.examLatencyMs,
    });

    const incident: Incident = {
      incidentId: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      workstationId,
      source,
      faultType,
      probableCause: mapping.probableCause,
      severity: mapping.severity,
      status: mapping.playbook && autoRecover ? 'recovering' : 'detected',
      nagiosVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    labStore.addIncident(incident);
    this.broadcastState();

    if (mapping.playbook && autoRecover) {
      setTimeout(() => {
        this.executeRecovery(incident.incidentId, mapping.playbook!, 'automated');
      }, 1500);
    } else if (!mapping.playbook) {
      labStore.updateIncident(incident.incidentId, { status: 'manual_required' });
      this.broadcastState();
    }

    return { incident, workstation: updatedWs };
  }

  executeRecovery(
    incidentId: string,
    playbook: string,
    triggerMode: 'automated' | 'manual_admin'
  ): RecoveryLog | null {
    const incident = labStore.getIncidents().find((i) => i.incidentId === incidentId);
    const workstationId = incident?.workstationId;
    if (!workstationId) return null;

    const ws = labStore.getWorkstation(workstationId);
    if (!ws) return null;

    labStore.updateWorkstation(workstationId, { status: 'recovering' });
    if (incident) {
      labStore.updateIncident(incidentId, { status: 'recovering' });
    }
    this.broadcastState();

    const start = Date.now();
    // Simulate deterministic Ansible playbook verification & restoration
    const restoredPatch: Partial<Workstation> = {
      status: 'healthy',
      examServiceStatus: 'running',
      puppetConfigStatus: 'compliant',
      cpuPercent: playbook === 'recover_high_cpu.yml' ? 23.4 : Math.min(ws.cpuPercent, 32),
      memoryPercent: Math.min(ws.memoryPercent, 48),
      diskPercent: playbook === 'cleanup_disk.yml' ? 51.6 : Math.min(ws.diskPercent, 64),
      examLatencyMs: 19,
    };

    labStore.updateWorkstation(workstationId, restoredPatch);
    if (workstationId === 'WS-LAB1-01') {
      labStore.setExamGlobalHealthy(true);
    }

    labStore.addMetricLog({
      workstationId,
      timestamp: new Date().toISOString(),
      cpuPercent: restoredPatch.cpuPercent ?? 24,
      memoryPercent: restoredPatch.memoryPercent ?? 45,
      diskPercent: restoredPatch.diskPercent ?? 51,
      examLatencyMs: 19,
    });

    const durationMs = 1450 + Math.floor(Math.random() * 900);
    const output = [
      `PLAY [${playbook} -> ${workstationId}] ************************************`,
      `TASK [Connect via WinRM 192.168.10.x:5985] -> ok: [${workstationId}]`,
      `TASK [Execute self-healing remediation steps] -> changed: [${workstationId}]`,
      `TASK [Nagios active verification check_http / check_nrpe] -> ok: [${workstationId}] (HTTP 200 OK)`,
      `PLAY RECAP: ok=3 changed=1 unreachable=0 failed=0 elapsed=${(durationMs / 1000).toFixed(2)}s`,
    ].join('\n');

    const log: RecoveryLog = {
      recoveryId: `REC-${Math.floor(1000 + Math.random() * 9000)}`,
      incidentId,
      workstationId,
      playbook,
      triggerMode,
      success: true,
      verificationStatus: 'verified_ok',
      durationMs: Date.now() - start + durationMs,
      ansibleOutput: output,
      createdAt: new Date().toISOString(),
    };

    labStore.addRecoveryLog(log);
    if (incident) {
      labStore.updateIncident(incidentId, {
        status: 'resolved',
        nagiosVerified: true,
      });
    }

    // Resolve matching open QR issue reports on this workstation
    const reports = labStore.getSnapshot().issueReports.filter(
      (r) => r.workstationId === workstationId && r.status !== 'resolved'
    );
    for (const rep of reports) {
      if (rep.category !== 'Keyboard / Mouse Hardware' && rep.category !== 'Display / Power Issue') {
        labStore.updateIssueReport(rep.reportId, {
          status: 'resolved',
          resolvedAt: new Date().toISOString(),
        });
      }
    }

    this.broadcastState();
    return log;
  }

  enforcePuppetCompliance(workstationId: string): Workstation | undefined {
    const updated = labStore.updateWorkstation(workstationId, {
      puppetConfigStatus: 'compliant',
      status: 'healthy',
    });
    if (updated) {
      const openIncidents = labStore.getIncidents().filter(
        (i) => i.workstationId === workstationId && i.status !== 'resolved'
      );
      for (const inc of openIncidents) {
        labStore.updateIncident(inc.incidentId, {
          status: 'resolved',
          nagiosVerified: true,
        });
      }
      labStore.addRecoveryLog({
        recoveryId: `REC-${Math.floor(1000 + Math.random() * 9000)}`,
        incidentId: openIncidents[0]?.incidentId ?? 'PUPPET-SYNC',
        workstationId,
        playbook: 'puppet_agent_enforce.pp',
        triggerMode: 'manual_admin',
        success: true,
        verificationStatus: 'verified_ok',
        durationMs: 1820,
        ansibleOutput: `Notice: /Stage[main]/Exam_kiosk/File[C:/LabGuard/exam-kiosk.json]/content: content changed\nNotice: Applied catalog on ${workstationId} in 1.82 seconds`,
        createdAt: new Date().toISOString(),
      });
      this.broadcastState();
    }
    return updated;
  }

  handleStudentQrReport(input: {
    workstationId: string;
    studentName: string;
    rollNumber: string;
    category: IssueReport['category'];
    description: string;
  }): { report: IssueReport; incident: Incident } {
    const faultType = mapReportCategoryToFault(input.category);
    const mapping = FAULT_PLAYBOOK_MAP[faultType];

    const report: IssueReport = {
      reportId: `QR-${Math.floor(1000 + Math.random() * 9000)}`,
      workstationId: input.workstationId,
      studentName: input.studentName,
      rollNumber: input.rollNumber,
      category: input.category,
      description: input.description,
      severity: mapping.severity === 'critical' ? 'critical' : 'high',
      status: mapping.playbook ? 'auto_recovering' : 'escalated',
      assignedPlaybook: mapping.playbook,
      createdAt: new Date().toISOString(),
    };
    labStore.addIssueReport(report);

    const { incident } = this.injectFault(
      input.workstationId,
      faultType,
      'qr_report',
      Boolean(mapping.playbook)
    );

    return { report, incident };
  }
}

export const recoveryOrchestrator = new RecoveryOrchestrator();
