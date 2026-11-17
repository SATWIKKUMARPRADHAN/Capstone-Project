export type WorkstationStatus = 'healthy' | 'degraded' | 'failed' | 'recovering';
export type ExamServiceStatus = 'running' | 'stopped' | 'error';
export type PuppetStatus = 'compliant' | 'drifted';

export interface Workstation {
  workstationId: string;
  hostname: string;
  labRoom: string;
  seatNumber: number;
  ipAddress: string;
  osVersion: string;
  status: WorkstationStatus;
  examServiceStatus: ExamServiceStatus;
  puppetConfigStatus: PuppetStatus;
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  examLatencyMs: number;
  lastSeen: string;
}

export interface IssueReport {
  reportId: string;
  workstationId: string;
  studentName: string;
  rollNumber: string;
  category:
    | 'Exam App Frozen'
    | 'Network Disconnected'
    | 'High Lag / Slow PC'
    | 'Disk Full Warning'
    | 'Keyboard / Mouse Hardware'
    | 'Display / Power Issue';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'auto_recovering' | 'resolved' | 'escalated';
  assignedPlaybook: string | null;
  createdAt: string;
  resolvedAt?: string;
}

export interface Incident {
  incidentId: string;
  workstationId: string;
  source: 'nagios' | 'qr_report' | 'ml_anomaly' | 'manual';
  faultType:
    | 'EXAM_SERVICE_STOPPED'
    | 'CPU_SATURATION'
    | 'DISK_CRITICAL'
    | 'NETWORK_LOSS'
    | 'PUPPET_DRIFT'
    | 'HARDWARE_FAULT'
    | 'ML_BEHAVIOR_ANOMALY';
  probableCause: string;
  severity: 'warning' | 'critical';
  status: 'detected' | 'recovering' | 'resolved' | 'manual_required';
  nagiosVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryLog {
  recoveryId: string;
  incidentId: string;
  workstationId: string;
  playbook: string;
  triggerMode: 'automated' | 'manual_admin';
  success: boolean;
  verificationStatus: 'verified_ok' | 'verification_failed';
  durationMs: number;
  ansibleOutput: string;
  createdAt: string;
}

export interface MetricLog {
  id: string;
  workstationId: string;
  timestamp: string;
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  examLatencyMs: number;
  isAnomaly: boolean;
  anomalyScore: number;
  dominantFeature?: string;
}

export interface ExamSubmission {
  submissionId: string;
  studentName: string;
  rollNumber: string;
  workstationId: string;
  answers: Record<string, number>;
  score: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  submittedAt: string;
}

export interface ExamDraft {
  rollNumber: string;
  studentName: string;
  workstationId: string;
  answers: Record<string, number>;
  updatedAt: string;
}

export interface LabStateSnapshot {
  workstations: Workstation[];
  issueReports: IssueReport[];
  incidents: Incident[];
  recoveryLogs: RecoveryLog[];
  metricLogs: MetricLog[];
  examSubmissions: ExamSubmission[];
  examGlobalHealthy: boolean;
}
