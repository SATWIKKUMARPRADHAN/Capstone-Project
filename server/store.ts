import fs from 'fs';
import path from 'path';
import type {
  ExamDraft,
  ExamSubmission,
  Incident,
  IssueReport,
  LabStateSnapshot,
  MetricLog,
  RecoveryLog,
  Workstation,
} from './types.ts';
import { runIsolationForest } from './isolationForest.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'labguard-state.json');

function minutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}

function createInitialWorkstations(): Workstation[] {
  return [
    {
      workstationId: 'WS-LAB1-01',
      hostname: 'ws-lab1-01.lab.local',
      labRoom: 'CSE Exam Lab 1',
      seatNumber: 1,
      ipAddress: '192.168.10.101',
      osVersion: 'Windows 11 Pro 23H2',
      status: 'healthy',
      examServiceStatus: 'running',
      puppetConfigStatus: 'compliant',
      cpuPercent: 24,
      memoryPercent: 46,
      diskPercent: 48,
      examLatencyMs: 18,
      lastSeen: new Date().toISOString(),
    },
    {
      workstationId: 'WS-LAB1-02',
      hostname: 'ws-lab1-02.lab.local',
      labRoom: 'CSE Exam Lab 1',
      seatNumber: 2,
      ipAddress: '192.168.10.102',
      osVersion: 'Windows 11 Pro 23H2',
      status: 'healthy',
      examServiceStatus: 'running',
      puppetConfigStatus: 'compliant',
      cpuPercent: 19,
      memoryPercent: 41,
      diskPercent: 52,
      examLatencyMs: 21,
      lastSeen: new Date().toISOString(),
    },
    {
      workstationId: 'WS-LAB1-03',
      hostname: 'ws-lab1-03.lab.local',
      labRoom: 'CSE Exam Lab 1',
      seatNumber: 3,
      ipAddress: '192.168.10.103',
      osVersion: 'Windows 11 Pro 23H2',
      status: 'healthy',
      examServiceStatus: 'running',
      puppetConfigStatus: 'compliant',
      cpuPercent: 28,
      memoryPercent: 49,
      diskPercent: 44,
      examLatencyMs: 22,
      lastSeen: new Date().toISOString(),
    },
    {
      workstationId: 'WS-LAB1-04',
      hostname: 'ws-lab1-04.lab.local',
      labRoom: 'CSE Exam Lab 1',
      seatNumber: 4,
      ipAddress: '192.168.10.104',
      osVersion: 'Windows 10 Enterprise',
      status: 'healthy',
      examServiceStatus: 'running',
      puppetConfigStatus: 'compliant',
      cpuPercent: 31,
      memoryPercent: 53,
      diskPercent: 61,
      examLatencyMs: 25,
      lastSeen: new Date().toISOString(),
    },
    {
      workstationId: 'WS-LAB1-05',
      hostname: 'ws-lab1-05.lab.local',
      labRoom: 'CSE Exam Lab 1',
      seatNumber: 5,
      ipAddress: '192.168.10.105',
      osVersion: 'Windows 11 Pro 23H2',
      status: 'healthy',
      examServiceStatus: 'running',
      puppetConfigStatus: 'compliant',
      cpuPercent: 22,
      memoryPercent: 43,
      diskPercent: 39,
      examLatencyMs: 17,
      lastSeen: new Date().toISOString(),
    },
    {
      workstationId: 'WS-LAB1-06',
      hostname: 'ws-lab1-06.lab.local',
      labRoom: 'CSE Exam Lab 1',
      seatNumber: 6,
      ipAddress: '192.168.10.106',
      osVersion: 'Windows 11 Pro 23H2',
      status: 'degraded',
      examServiceStatus: 'running',
      puppetConfigStatus: 'drifted',
      cpuPercent: 74,
      memoryPercent: 78,
      diskPercent: 86,
      examLatencyMs: 142,
      lastSeen: new Date().toISOString(),
    },
    {
      workstationId: 'WS-LAB1-07',
      hostname: 'ws-lab1-07.lab.local',
      labRoom: 'CSE Exam Lab 1',
      seatNumber: 7,
      ipAddress: '192.168.10.107',
      osVersion: 'Windows 10 Enterprise',
      status: 'healthy',
      examServiceStatus: 'running',
      puppetConfigStatus: 'compliant',
      cpuPercent: 26,
      memoryPercent: 47,
      diskPercent: 55,
      examLatencyMs: 20,
      lastSeen: new Date().toISOString(),
    },
    {
      workstationId: 'WS-LAB1-08',
      hostname: 'ws-lab1-08.lab.local',
      labRoom: 'CSE Exam Lab 1',
      seatNumber: 8,
      ipAddress: '192.168.10.108',
      osVersion: 'Windows 11 Pro 23H2',
      status: 'healthy',
      examServiceStatus: 'running',
      puppetConfigStatus: 'compliant',
      cpuPercent: 21,
      memoryPercent: 45,
      diskPercent: 47,
      examLatencyMs: 19,
      lastSeen: new Date().toISOString(),
    },
  ];
}

function createInitialMetricLogs(): MetricLog[] {
  const logs: MetricLog[] = [];
  const ids = [
    'WS-LAB1-01',
    'WS-LAB1-02',
    'WS-LAB1-03',
    'WS-LAB1-04',
    'WS-LAB1-05',
    'WS-LAB1-06',
    'WS-LAB1-07',
    'WS-LAB1-08',
  ];

  // Generate 48 structured historical baseline observations + 4 realistic anomaly spikes
  for (let i = 47; i >= 0; i--) {
    const wsId = ids[i % ids.length];
    const isAnomalySpike = i === 6 || i === 18 || i === 31 || i === 2;
    const baseCpu = isAnomalySpike
      ? i === 18
        ? 95.4
        : i === 6
          ? 88.2
          : 74.0
      : 18 + ((i * 7) % 18);
    const baseMem = isAnomalySpike ? 89.5 : 40 + ((i * 5) % 16);
    const baseDisk = i === 2 ? 93.6 : 42 + ((i * 3) % 22);
    const latency = isAnomalySpike ? (i === 18 ? 430 : 285) : 15 + ((i * 4) % 14);

    logs.push({
      id: `ML-${1000 + (48 - i)}`,
      workstationId: i === 2 ? 'WS-LAB1-06' : wsId,
      timestamp: minutesAgo(i * 3),
      cpuPercent: Number(baseCpu.toFixed(1)),
      memoryPercent: Number(baseMem.toFixed(1)),
      diskPercent: Number(baseDisk.toFixed(1)),
      examLatencyMs: latency,
      isAnomaly: false,
      anomalyScore: 0,
    });
  }

  return runIsolationForest(logs, 0.08).results;
}

function createSeedState(): LabStateSnapshot & { drafts: Record<string, ExamDraft> } {
  return {
    workstations: createInitialWorkstations(),
    issueReports: [
      {
        reportId: 'QR-2026-001',
        workstationId: 'WS-LAB1-03',
        studentName: 'Aarav Sharma',
        rollNumber: '22BCS1042',
        category: 'Exam App Frozen',
        description: 'Exam client froze while loading Question 4 during mock test.',
        severity: 'high',
        status: 'resolved',
        assignedPlaybook: 'restart_exam_service.yml',
        createdAt: minutesAgo(42),
        resolvedAt: minutesAgo(41),
      },
      {
        reportId: 'QR-2026-002',
        workstationId: 'WS-LAB1-06',
        studentName: 'Priya Nair',
        rollNumber: '22BCS1088',
        category: 'High Lag / Slow PC',
        description: 'System disk space low warning and high browser input lag.',
        severity: 'medium',
        status: 'open',
        assignedPlaybook: 'cleanup_disk.yml',
        createdAt: minutesAgo(9),
      },
    ],
    incidents: [
      {
        incidentId: 'INC-801',
        workstationId: 'WS-LAB1-03',
        source: 'nagios',
        faultType: 'EXAM_SERVICE_STOPPED',
        probableCause: 'LabGuardExamService stopped responding on /api/exam/health (HTTP 503)',
        severity: 'critical',
        status: 'resolved',
        nagiosVerified: true,
        createdAt: minutesAgo(42),
        updatedAt: minutesAgo(41),
      },
      {
        incidentId: 'INC-802',
        workstationId: 'WS-LAB1-06',
        source: 'ml_anomaly',
        faultType: 'DISK_CRITICAL',
        probableCause: 'Temp directory saturation (86% disk) and Puppet kiosk config drift detected',
        severity: 'warning',
        status: 'detected',
        nagiosVerified: false,
        createdAt: minutesAgo(8),
        updatedAt: minutesAgo(8),
      },
    ],
    recoveryLogs: [
      {
        recoveryId: 'REC-501',
        incidentId: 'INC-801',
        workstationId: 'WS-LAB1-03',
        playbook: 'restart_exam_service.yml',
        triggerMode: 'automated',
        success: true,
        verificationStatus: 'verified_ok',
        durationMs: 2840,
        ansibleOutput:
          'PLAY [Recover Stopped Examination Application Service] ***\nTASK [Stop stale exam service] -> changed: [WS-LAB1-03]\nTASK [Restart LabGuardExamService] -> changed: [WS-LAB1-03]\nTASK [Verify /api/exam/health HTTP 200] -> ok: [WS-LAB1-03]\nPLAY RECAP: ok=4 changed=2 unreachable=0 failed=0',
        createdAt: minutesAgo(41),
      },
    ],
    metricLogs: createInitialMetricLogs(),
    examSubmissions: [
      {
        submissionId: 'SUB-101',
        studentName: 'Rohan Verma',
        rollNumber: '22BCS1015',
        workstationId: 'WS-LAB1-01',
        answers: { Q1: 2, Q2: 1, Q3: 1, Q4: 0, Q5: 1, Q6: 1, Q7: 2, Q8: 0 },
        score: 8,
        totalQuestions: 8,
        timeSpentSeconds: 312,
        submittedAt: minutesAgo(55),
      },
    ],
    examGlobalHealthy: true,
    drafts: {},
  };
}

class LabStore {
  private state: LabStateSnapshot & { drafts: Record<string, ExamDraft> };

  constructor() {
    this.state = this.load();
  }

  private load(): LabStateSnapshot & { drafts: Record<string, ExamDraft> } {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.workstations)) {
          return parsed;
        }
      }
    } catch {
      // Fall back to fresh seed state if file corrupted
    }
    const seed = createSeedState();
    this.persist(seed);
    return seed;
  }

  private persist(targetState = this.state): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STATE_FILE, JSON.stringify(targetState, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist store:', err);
    }
  }

  getSnapshot(): LabStateSnapshot {
    const { drafts: _drafts, ...publicState } = this.state;
    return publicState;
  }

  getWorkstations(): Workstation[] {
    return this.state.workstations;
  }

  getWorkstation(workstationId: string): Workstation | undefined {
    return this.state.workstations.find((w) => w.workstationId === workstationId);
  }

  addWorkstation(input: {
    workstationId: string;
    hostname: string;
    labRoom: string;
    seatNumber: number;
    ipAddress: string;
    osVersion: string;
  }): Workstation {
    const existing = this.getWorkstation(input.workstationId);
    if (existing) {
      throw new Error(`Workstation ${input.workstationId} already exists`);
    }
    const node: Workstation = {
      ...input,
      status: 'healthy',
      examServiceStatus: 'running',
      puppetConfigStatus: 'compliant',
      cpuPercent: 18,
      memoryPercent: 39,
      diskPercent: 42,
      examLatencyMs: 16,
      lastSeen: new Date().toISOString(),
    };
    this.state.workstations.push(node);
    this.persist();
    return node;
  }

  updateWorkstation(workstationId: string, patch: Partial<Workstation>): Workstation | undefined {
    const idx = this.state.workstations.findIndex((w) => w.workstationId === workstationId);
    if (idx === -1) return undefined;
    this.state.workstations[idx] = {
      ...this.state.workstations[idx],
      ...patch,
      lastSeen: new Date().toISOString(),
    };
    this.persist();
    return this.state.workstations[idx];
  }

  deleteWorkstation(workstationId: string): boolean {
    const prevLen = this.state.workstations.length;
    this.state.workstations = this.state.workstations.filter(
      (w) => w.workstationId !== workstationId
    );
    if (this.state.workstations.length !== prevLen) {
      this.persist();
      return true;
    }
    return false;
  }

  addIssueReport(report: IssueReport): IssueReport {
    this.state.issueReports.unshift(report);
    this.persist();
    return report;
  }

  updateIssueReport(reportId: string, patch: Partial<IssueReport>): IssueReport | undefined {
    const idx = this.state.issueReports.findIndex((r) => r.reportId === reportId);
    if (idx === -1) return undefined;
    this.state.issueReports[idx] = { ...this.state.issueReports[idx], ...patch };
    this.persist();
    return this.state.issueReports[idx];
  }

  addIncident(incident: Incident): Incident {
    this.state.incidents.unshift(incident);
    this.persist();
    return incident;
  }

  updateIncident(incidentId: string, patch: Partial<Incident>): Incident | undefined {
    const idx = this.state.incidents.findIndex((i) => i.incidentId === incidentId);
    if (idx === -1) return undefined;
    this.state.incidents[idx] = {
      ...this.state.incidents[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.state.incidents[idx];
  }

  getIncidents(): Incident[] {
    return this.state.incidents;
  }

  addRecoveryLog(log: RecoveryLog): RecoveryLog {
    this.state.recoveryLogs.unshift(log);
    this.persist();
    return log;
  }

  addMetricLog(entry: Omit<MetricLog, 'id' | 'isAnomaly' | 'anomalyScore'>): MetricLog {
    const log: MetricLog = {
      ...entry,
      id: `ML-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isAnomaly: false,
      anomalyScore: 0,
    };
    this.state.metricLogs.push(log);
    if (this.state.metricLogs.length > 160) {
      this.state.metricLogs = this.state.metricLogs.slice(-160);
    }
    const analysis = runIsolationForest(this.state.metricLogs, 0.08);
    this.state.metricLogs = analysis.results;
    this.persist();
    return this.state.metricLogs[this.state.metricLogs.length - 1];
  }

  getMetricLogs(): MetricLog[] {
    return this.state.metricLogs;
  }

  setExamGlobalHealthy(healthy: boolean): void {
    this.state.examGlobalHealthy = healthy;
    this.persist();
  }

  getExamGlobalHealthy(): boolean {
    return this.state.examGlobalHealthy;
  }

  saveExamDraft(draft: ExamDraft): void {
    this.state.drafts[draft.rollNumber] = draft;
    this.persist();
  }

  getExamDraft(rollNumber: string): ExamDraft | undefined {
    return this.state.drafts[rollNumber];
  }

  addExamSubmission(submission: ExamSubmission): ExamSubmission {
    this.state.examSubmissions.unshift(submission);
    delete this.state.drafts[submission.rollNumber];
    this.persist();
    return submission;
  }

  resetDemoState(): LabStateSnapshot {
    this.state = createSeedState();
    this.persist();
    return this.getSnapshot();
  }
}

export const labStore = new LabStore();
