import { useState } from 'react';
import { CheckCircle2, Play, ShieldCheck, Terminal, Wrench, Zap } from 'lucide-react';
import { api } from '../lib/api';
import type { LabStateSnapshot } from '../types';

interface AutomationDevOpsViewProps {
  state: LabStateSnapshot;
  onRefresh: () => void;
}

const FAULT_OPTIONS = [
  { value: 'EXAM_SERVICE_STOPPED', label: 'Exam Service Stopped (restart_exam_service.yml)' },
  { value: 'CPU_SATURATION', label: 'High CPU Saturation >90% (recover_high_cpu.yml)' },
  { value: 'DISK_CRITICAL', label: 'Disk Capacity >92% (cleanup_disk.yml)' },
  { value: 'NETWORK_LOSS', label: 'Network / DNS Drop (reset_network_adapter.yml)' },
  { value: 'PUPPET_DRIFT', label: 'Kiosk Configuration Drift (restore_exam_kiosk.yml)' },
  { value: 'HARDWARE_FAULT', label: 'Physical Hardware Fault (Escalate to Admin)' },
];

export function AutomationDevOpsView({ state, onRefresh }: AutomationDevOpsViewProps) {
  const [targetWs, setTargetWs] = useState(state.workstations[0]?.workstationId || 'WS-LAB1-01');
  const [faultType, setFaultType] = useState('EXAM_SERVICE_STOPPED');
  const [autoRecover, setAutoRecover] = useState(true);
  const [injecting, setInjecting] = useState(false);

  const handleInject = async () => {
    setInjecting(true);
    try {
      await api.injectFault({ workstationId: targetWs, faultType, autoRecover });
      onRefresh();
    } finally {
      setInjecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Interactive Self-Healing Fault Injection & Triage Simulator */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Self-Healing Fault Injection & Recovery Orchestrator
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Demonstrate Nagios alert detection, backend triage, Ansible playbook execution, and post-recovery verification
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Target Workstation
            </label>
            <select
              value={targetWs}
              onChange={(e) => setTargetWs(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg bg-white"
            >
              {state.workstations.map((w) => (
                <option key={w.workstationId} value={w.workstationId}>
                  {w.workstationId} ({w.status})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Simulated Failure Scenario
            </label>
            <select
              value={faultType}
              onChange={(e) => setFaultType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
            >
              {FAULT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={autoRecover}
                onChange={(e) => setAutoRecover(e.target.checked)}
                className="rounded border-slate-300 text-blue-700"
              />
              Auto-Heal
            </label>
            <button
              type="button"
              onClick={handleInject}
              disabled={injecting}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap disabled:opacity-60"
            >
              <Zap className="w-3.5 h-3.5" />
              {injecting ? 'Running...' : 'Trigger Fault'}
            </button>
          </div>
        </div>
      </section>

      {/* Nagios Checks + Puppet Configuration Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-display text-base font-semibold text-slate-900">
            Nagios Infrastructure Checks
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Active service probes forwarding HARD state webhooks to /api/nagios/webhook
          </p>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="py-2 px-3">Workstation</th>
                  <th className="py-2 px-3">check_exam_http</th>
                  <th className="py-2 px-3">check_nrpe_cpu</th>
                  <th className="py-2 px-3">check_nrpe_disk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                {state.workstations.map((ws) => (
                  <tr key={ws.workstationId}>
                    <td className="py-2 px-3 font-semibold text-slate-900">{ws.workstationId}</td>
                    <td
                      className={`py-2 px-3 ${
                        ws.examServiceStatus === 'running' ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {ws.examServiceStatus === 'running' ? 'OK (200)' : 'CRITICAL (503)'}
                    </td>
                    <td
                      className={`py-2 px-3 ${
                        ws.cpuPercent > 80 ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      {ws.cpuPercent > 80 ? `WARN (${ws.cpuPercent}%)` : `OK (${ws.cpuPercent}%)`}
                    </td>
                    <td
                      className={`py-2 px-3 ${
                        ws.diskPercent > 85 ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {ws.diskPercent > 85 ? `WARN (${ws.diskPercent}%)` : `OK (${ws.diskPercent}%)`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-display text-base font-semibold text-slate-900">
            Puppet Configuration Management Status
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Enforces exam-kiosk.json, WinRM, NTP w32time, and NSClient++ baseline state
          </p>

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
            {state.workstations.map((ws) => (
              <div
                key={ws.workstationId}
                className="px-3 py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-mono font-semibold text-slate-900">{ws.workstationId}</span>
                  <span className="text-slate-400 mx-2">·</span>
                  <span className="text-slate-500">{ws.hostname}</span>
                </div>
                {ws.puppetConfigStatus === 'compliant' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Compliant
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => api.enforcePuppet(ws.workstationId)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Enforce Manifest
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Ansible Recovery Audit History */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Ansible Automated & Manual Recovery Audit Log
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Playbook execution history with post-recovery Nagios verification
            </p>
          </div>
        </div>

        {/* Manual Trigger Queue for Unresolved Incidents */}
        {state.incidents.some((i) => i.status !== 'resolved') && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
            <div className="text-xs font-semibold text-amber-900">
              Incidents Awaiting Admin Action / Verification
            </div>
            {state.incidents
              .filter((i) => i.status !== 'resolved')
              .map((inc) => (
                <div
                  key={inc.incidentId}
                  className="flex flex-wrap items-center justify-between gap-3 text-xs pt-2 border-t border-amber-200/70"
                >
                  <div>
                    <span className="font-mono font-semibold text-slate-900">
                      {inc.incidentId} · {inc.workstationId}
                    </span>{' '}
                    — {inc.probableCause}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      api.executeRecovery({
                        incidentId: inc.incidentId,
                        playbook:
                          inc.faultType === 'DISK_CRITICAL'
                            ? 'cleanup_disk.yml'
                            : inc.faultType === 'CPU_SATURATION'
                              ? 'recover_high_cpu.yml'
                              : inc.faultType === 'NETWORK_LOSS'
                                ? 'reset_network_adapter.yml'
                                : 'restart_exam_service.yml',
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap"
                  >
                    <Play className="w-3 h-3" />
                    Execute Ansible Playbook
                  </button>
                </div>
              ))}
          </div>
        )}

        <div className="space-y-3">
          {state.recoveryLogs.map((rec) => (
            <div key={rec.recoveryId} className="border border-slate-200 rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-700" />
                  <span className="font-mono font-semibold text-slate-900">{rec.playbook}</span>
                  <span className="text-slate-400">·</span>
                  <span className="font-mono text-slate-700">{rec.workstationId}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">
                    {rec.triggerMode === 'automated' ? 'Automated Self-Heal' : 'Manual Admin'}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono tabular-nums">
                  <span className="text-slate-500">{rec.durationMs}ms</span>
                  <span className="text-emerald-700 font-semibold">
                    {rec.verificationStatus === 'verified_ok' ? 'Verified OK' : 'Failed'}
                  </span>
                </div>
              </div>
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed">
                {rec.ansibleOutput}
              </pre>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
