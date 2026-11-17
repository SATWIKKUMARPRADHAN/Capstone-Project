import type {
  AnomalyAnalysisResult,
  ExamQuestionClient,
  ExamSubmission,
  IssueReport,
  LabStateSnapshot,
  Workstation,
} from '../types';

async function jsonFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getState: () => jsonFetch<LabStateSnapshot>('/api/state'),
  resetState: () => jsonFetch<LabStateSnapshot>('/api/state/reset', { method: 'POST' }),

  addWorkstation: (payload: {
    workstationId: string;
    hostname: string;
    labRoom: string;
    seatNumber: number;
    ipAddress: string;
    osVersion: string;
  }) =>
    jsonFetch<Workstation>('/api/workstations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteWorkstation: (id: string) =>
    jsonFetch<{ deleted: boolean }>(`/api/workstations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getWorkstationQr: (id: string) =>
    jsonFetch<{ workstationId: string; reportUrl: string; dataUrl: string }>(
      `/api/workstations/${encodeURIComponent(id)}/qr`
    ),

  submitReport: (payload: {
    workstationId: string;
    studentName: string;
    rollNumber: string;
    category: IssueReport['category'];
    description: string;
  }) =>
    jsonFetch<{ report: IssueReport }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  resolveReport: (reportId: string) =>
    jsonFetch<IssueReport>(`/api/reports/${encodeURIComponent(reportId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'resolved' }),
    }),

  injectFault: (payload: {
    workstationId: string;
    faultType: string;
    autoRecover: boolean;
  }) =>
    jsonFetch('/api/faults/inject', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  executeRecovery: (payload: { incidentId: string; playbook: string }) =>
    jsonFetch('/api/recovery/execute', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  enforcePuppet: (workstationId: string) =>
    jsonFetch<Workstation>('/api/puppet/enforce', {
      method: 'POST',
      body: JSON.stringify({ workstationId }),
    }),

  analyzeAnomalies: (contamination: number) =>
    jsonFetch<AnomalyAnalysisResult>(`/api/ml/analyze?contamination=${contamination}`),

  getExamQuestions: () =>
    jsonFetch<{
      examTitle: string;
      durationMinutes: number;
      questions: ExamQuestionClient[];
    }>('/api/exam/questions'),

  getExamDraft: (rollNumber: string) =>
    jsonFetch<{ draft: { answers: Record<string, number>; updatedAt: string } | null }>(
      `/api/exam/draft/${encodeURIComponent(rollNumber)}`
    ),

  autosaveExam: (payload: {
    rollNumber: string;
    studentName: string;
    workstationId: string;
    answers: Record<string, number>;
  }) =>
    jsonFetch<{ saved: boolean; updatedAt: string }>('/api/exam/autosave', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  submitExam: (payload: {
    rollNumber: string;
    studentName: string;
    workstationId: string;
    answers: Record<string, number>;
    timeSpentSeconds: number;
  }) =>
    jsonFetch<ExamSubmission>('/api/exam/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  toggleExamService: (healthy: boolean) =>
    jsonFetch<{ examGlobalHealthy: boolean }>('/api/exam/toggle-service', {
      method: 'POST',
      body: JSON.stringify({ healthy }),
    }),

  checkExamHealthRaw: async () => {
    const res = await fetch('/api/exam/health');
    const data = await res.json();
    return { statusCode: res.status, data };
  },

  getProjectFiles: () =>
    jsonFetch<{ files: { path: string; content: string }[] }>('/api/project/files'),

  downloadProjectZip: async () => {
    const res = await fetch('/api/project/download-zip', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`ZIP download failed (HTTP ${res.status})`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(new Blob([blob], { type: 'application/zip' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'LabGuard-BTech-Capstone-Project.zip';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  },
};
