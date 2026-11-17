import { useEffect, useState } from 'react';
import { CheckCircle2, QrCode, Send } from 'lucide-react';
import { api } from '../lib/api';
import type { IssueReport, Workstation } from '../types';

interface QrIssuePortalViewProps {
  workstations: Workstation[];
  initialWorkstationId: string;
  recentReports: IssueReport[];
  onSubmitted: () => void;
}

const CATEGORIES: IssueReport['category'][] = [
  'Exam App Frozen',
  'Network Disconnected',
  'High Lag / Slow PC',
  'Disk Full Warning',
  'Keyboard / Mouse Hardware',
  'Display / Power Issue',
];

export function QrIssuePortalView({
  workstations,
  initialWorkstationId,
  recentReports,
  onSubmitted,
}: QrIssuePortalViewProps) {
  const [workstationId, setWorkstationId] = useState(
    initialWorkstationId || workstations[0]?.workstationId || 'WS-LAB1-01'
  );
  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [category, setCategory] = useState<IssueReport['category']>('Exam App Frozen');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<IssueReport | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialWorkstationId) {
      setWorkstationId(initialWorkstationId);
    }
  }, [initialWorkstationId]);

  const selectedWs = workstations.find((w) => w.workstationId === workstationId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.submitReport({
        workstationId,
        studentName,
        rollNumber,
        category,
        description,
      });
      setReceipt(res.report);
      setDescription('');
      onSubmitted();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Student Mobile QR Reporting Form */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
              <QrCode className="w-4 h-4" />
              QR Workstation Identification Active
            </div>
            <h2 className="font-display text-xl font-bold text-slate-900 mt-1">
              Report Workstation Technical Issue
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Automated recovery playbooks run immediately for software and network faults; hardware faults dispatch a lab technician.
            </p>
          </div>
        </div>

        {receipt ? (
          <div className="mt-6 p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              Issue Report Logged ({receipt.reportId})
            </div>
            <p className="text-sm text-emerald-900">
              Workstation <span className="font-mono font-semibold">{receipt.workstationId}</span>{' '}
              reported for <strong>{receipt.category}</strong>.
            </p>
            <p className="text-xs text-emerald-800">
              {receipt.assignedPlaybook
                ? `Automated Recovery Triggered: Ansible playbook "${receipt.assignedPlaybook}" is executing and verifying health.`
                : 'Hardware Escalation: Lab administrator has been notified for physical inspection.'}
            </p>
            <button
              type="button"
              onClick={() => setReceipt(null)}
              className="px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
            >
              Submit Another Report
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs text-slate-500">Identified Workstation</div>
                <div className="font-mono text-base font-bold text-slate-900">
                  {workstationId}
                </div>
                {selectedWs && (
                  <div className="text-xs text-slate-500 font-mono">
                    {selectedWs.labRoom} · Seat {selectedWs.seatNumber} · {selectedWs.ipAddress}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Switch Node</label>
                <select
                  value={workstationId}
                  onChange={(e) => setWorkstationId(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg bg-white"
                >
                  {workstations.map((w) => (
                    <option key={w.workstationId} value={w.workstationId}>
                      {w.workstationId}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Student Name
                </label>
                <input
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Ananya Verma"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  University Roll Number
                </label>
                <input
                  required
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 22BCS1094"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Issue Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-2.5 text-left text-xs font-medium rounded-lg border transition-colors ${
                      category === cat
                        ? 'border-blue-700 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Problem Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what appeared on screen or which peripheral failed..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Dispatching Report...' : 'Submit Issue Report'}
            </button>
          </form>
        )}
      </div>

      {/* Right: Live Report Feed */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-display text-base font-semibold text-slate-900">
          Live Report & Triage Feed
        </h3>
        <p className="text-xs text-slate-500 mt-0.5 mb-4">
          Updates in real time across student devices and the admin console
        </p>

        <div className="divide-y divide-slate-200">
          {recentReports.slice(0, 7).map((rep) => (
            <div key={rep.reportId} className="py-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-slate-900">
                  {rep.workstationId} · {rep.reportId}
                </span>
                <span
                  className={`font-medium ${
                    rep.status === 'resolved'
                      ? 'text-emerald-700'
                      : rep.status === 'escalated'
                        ? 'text-red-700'
                        : 'text-amber-700'
                  }`}
                >
                  {rep.status.replace('_', ' ')}
                </span>
              </div>
              <div className="text-xs font-medium text-slate-800 mt-1">{rep.category}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {rep.studentName} ({rep.rollNumber})
                {rep.assignedPlaybook ? ` · Playbook: ${rep.assignedPlaybook}` : ' · Manual dispatch'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
