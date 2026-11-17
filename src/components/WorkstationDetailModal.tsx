import { useEffect, useState } from 'react';
import { QrCode, ShieldCheck, Wrench, X, Zap } from 'lucide-react';
import { api } from '../lib/api';
import type { Workstation } from '../types';

interface WorkstationDetailModalProps {
  workstation: Workstation | null;
  onClose: () => void;
  onInjectFault: (workstationId: string, faultType: string, autoRecover: boolean) => void;
  onEnforcePuppet: (workstationId: string) => void;
  onOpenReportFor: (workstationId: string) => void;
}

export function WorkstationDetailModal({
  workstation,
  onClose,
  onInjectFault,
  onEnforcePuppet,
  onOpenReportFor,
}: WorkstationDetailModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!workstation) return;
    api
      .getWorkstationQr(workstation.workstationId)
      .then((res) => setQrDataUrl(res.dataUrl))
      .catch(() => setQrDataUrl(''));
  }, [workstation?.workstationId]);

  if (!workstation) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900 font-mono">
              {workstation.workstationId}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {workstation.hostname} · {workstation.ipAddress} · {workstation.osVersion}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div className="sm:col-span-2 grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-slate-500">Node Health</div>
              <div className="font-semibold text-slate-900 mt-1 capitalize">
                {workstation.status}
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-slate-500">Exam Service</div>
              <div className="font-mono font-semibold text-slate-900 mt-1">
                {workstation.examServiceStatus} ({workstation.examLatencyMs}ms)
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-slate-500">CPU / RAM / Disk</div>
              <div className="font-mono tabular-nums font-semibold text-slate-900 mt-1">
                {workstation.cpuPercent}% / {workstation.memoryPercent}% / {workstation.diskPercent}%
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-slate-500">Puppet Baseline</div>
              <div className="font-semibold text-slate-900 mt-1 capitalize">
                {workstation.puppetConfigStatus}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-2 border border-slate-200 rounded-lg">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR for ${workstation.workstationId}`}
                className="w-24 h-24"
                referrerPolicy="no-referrer"
              />
            ) : (
              <QrCode className="w-12 h-12 text-slate-300" />
            )}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenReportFor(workstation.workstationId);
              }}
              className="mt-1.5 text-[11px] font-medium text-blue-700 hover:underline"
            >
              Simulate QR Scan
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 space-y-2">
          <div className="text-xs font-semibold text-slate-700">
            Quick Fault Simulation & Puppet Control
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onInjectFault(workstation.workstationId, 'EXAM_SERVICE_STOPPED', true);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg"
            >
              <Zap className="w-3.5 h-3.5" />
              Crash Exam Service (Auto-Heal)
            </button>
            <button
              type="button"
              onClick={() => {
                onInjectFault(workstation.workstationId, 'CPU_SATURATION', true);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              <Wrench className="w-3.5 h-3.5" />
              Inject CPU Spike
            </button>
            <button
              type="button"
              onClick={() => {
                onEnforcePuppet(workstation.workstationId);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Enforce Puppet Catalog
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
