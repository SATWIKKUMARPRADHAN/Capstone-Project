import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  HardDrive,
  RefreshCw,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import type { LabStateSnapshot, NavTab, Workstation } from '../types';
import { TelemetryChart } from './TelemetryChart';

interface OverviewViewProps {
  state: LabStateSnapshot;
  onSelectTab: (tab: NavTab) => void;
  onInspectWorkstation: (ws: Workstation) => void;
  onTriggerRecovery: (incidentId: string, playbook: string) => void;
  onResolveReport: (reportId: string) => void;
  onEnforcePuppet: (workstationId: string) => void;
}

function StatusLabel({ status }: { status: Workstation['status'] }) {
  if (status === 'healthy') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Healthy
      </span>
    );
  }
  if (status === 'recovering') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        Recovering
      </span>
    );
  }
  if (status === 'degraded') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
        <AlertTriangle className="w-3.5 h-3.5" />
        Degraded
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
      <ShieldAlert className="w-3.5 h-3.5" />
      Failed
    </span>
  );
}

export function OverviewView({
  state,
  onSelectTab,
  onInspectWorkstation,
  onTriggerRecovery,
  onResolveReport,
  onEnforcePuppet,
}: OverviewViewProps) {
  const totalNodes = state.workstations.length;
  const healthyNodes = state.workstations.filter((w) => w.status === 'healthy').length;
  const failedOrDegraded = totalNodes - healthyNodes;
  const openIncidents = state.incidents.filter((i) => i.status !== 'resolved');
  const openReports = state.issueReports.filter((r) => r.status !== 'resolved');
  const anomalyCount = state.metricLogs.filter((m) => m.isAnomaly).length;

  return (
    <div className="space-y-6">
      {/* KPI Strip: Single-level bordered cells, tabular-nums */}
      <section aria-label="Laboratory Summary Metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Registered Workstations</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono tabular-nums text-2xl font-bold text-slate-900">
              {totalNodes}
            </span>
            <span className="text-xs text-slate-500">CSE Exam Lab 1</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Workstation Health</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono tabular-nums text-2xl font-bold text-emerald-700">
              {healthyNodes}/{totalNodes}
            </span>
            <span className="text-xs text-slate-600 tabular-nums">
              {failedOrDegraded === 0 ? 'All nominal' : `${failedOrDegraded} attention`}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Exam Application Status</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`font-display text-xl font-bold ${
                state.examGlobalHealthy ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {state.examGlobalHealthy ? 'Operational' : 'Service Stopped'}
            </span>
            <button
              type="button"
              onClick={() => onSelectTab('exam')}
              className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
            >
              Open Exam
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Incidents & ML Anomalies</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono tabular-nums text-2xl font-bold text-slate-900">
              {openIncidents.length}
            </span>
            <span className="text-xs text-slate-600 tabular-nums">
              {state.recoveryLogs.length} recovered · {anomalyCount} anomalies
            </span>
          </div>
        </div>
      </section>

      {/* Lab Floor Grid */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Live Laboratory Floor Matrix
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any workstation to inspect telemetry, view its QR sticker, or test Ansible recovery
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('workstations')}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            Manage Registry
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {state.workstations.map((ws) => (
            <button
              key={ws.workstationId}
              type="button"
              onClick={() => onInspectWorkstation(ws)}
              className={`text-left p-4 rounded-xl border transition-colors focus-visible:outline-2 focus-visible:outline-blue-700 ${
                ws.status === 'failed'
                  ? 'border-red-300 bg-red-50/40 hover:bg-red-50'
                  : ws.status === 'degraded' || ws.status === 'recovering'
                    ? 'border-amber-300 bg-amber-50/40 hover:bg-amber-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-slate-900">
                  {ws.workstationId}
                </span>
                <StatusLabel status={ws.status} />
              </div>

              <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                {ws.ipAddress} · Seat {ws.seatNumber}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/80 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-slate-400 flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> CPU
                  </div>
                  <div
                    className={`font-mono tabular-nums font-semibold mt-0.5 ${
                      ws.cpuPercent > 80 ? 'text-red-700' : 'text-slate-800'
                    }`}
                  >
                    {ws.cpuPercent}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">RAM</div>
                  <div className="font-mono tabular-nums font-semibold text-slate-800 mt-0.5">
                    {ws.memoryPercent}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 flex items-center gap-1">
                    <HardDrive className="w-3 h-3" /> Disk
                  </div>
                  <div
                    className={`font-mono tabular-nums font-semibold mt-0.5 ${
                      ws.diskPercent > 85 ? 'text-amber-700' : 'text-slate-800'
                    }`}
                  >
                    {ws.diskPercent}%
                  </div>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                <span>Exam: {ws.examServiceStatus}</span>
                <span className={ws.puppetConfigStatus === 'drifted' ? 'text-amber-700 font-medium' : ''}>
                  Puppet: {ws.puppetConfigStatus}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Telemetry Chart */}
      <TelemetryChart metrics={state.metricLogs} />

      {/* Active Incidents & Student QR Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                Detected Incidents & Recovery Queue
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Correlated Nagios alerts, QR triggers, and ML anomalies
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('automation')}
              className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
            >
              View Orchestrator
            </button>
          </div>

          {state.incidents.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No incidents recorded.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {state.incidents.slice(0, 5).map((inc) => (
                <div key={inc.incidentId} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-semibold text-slate-900">
                        {inc.workstationId}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono text-slate-600">{inc.faultType}</span>
                      <span className="text-slate-400">·</span>
                      <span
                        className={
                          inc.status === 'resolved'
                            ? 'text-emerald-700 font-medium'
                            : inc.status === 'manual_required'
                              ? 'text-red-700 font-medium'
                              : 'text-amber-700 font-medium'
                        }
                      >
                        {inc.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{inc.probableCause}</p>
                  </div>

                  {inc.status !== 'resolved' && (
                    <button
                      type="button"
                      onClick={() =>
                        inc.faultType === 'PUPPET_DRIFT'
                          ? onEnforcePuppet(inc.workstationId)
                          : onTriggerRecovery(
                              inc.incidentId,
                              inc.faultType === 'DISK_CRITICAL'
                                ? 'cleanup_disk.yml'
                                : inc.faultType === 'CPU_SATURATION'
                                  ? 'recover_high_cpu.yml'
                                  : inc.faultType === 'NETWORK_LOSS'
                                    ? 'reset_network_adapter.yml'
                                    : 'restart_exam_service.yml'
                            )
                      }
                      className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      Recover
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                Student QR Issue Reports
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {openReports.length} open · Submitted from physical lab desk QR stickers
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('report')}
              className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
            >
              Open QR Portal
            </button>
          </div>

          {state.issueReports.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No student QR reports submitted.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {state.issueReports.slice(0, 5).map((rep) => (
                <div key={rep.reportId} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-semibold text-slate-900">
                        {rep.workstationId}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-medium text-slate-800">{rep.category}</span>
                      <span className="text-slate-400">·</span>
                      <span
                        className={
                          rep.status === 'resolved' ? 'text-emerald-700' : 'text-amber-700'
                        }
                      >
                        {rep.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {rep.studentName} ({rep.rollNumber}) — {rep.description}
                    </p>
                  </div>

                  {rep.status !== 'resolved' && (
                    <button
                      type="button"
                      onClick={() => onResolveReport(rep.reportId)}
                      className="shrink-0 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
