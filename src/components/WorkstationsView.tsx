import { useState } from 'react';
import { Download, ExternalLink, Plus, QrCode, Search, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import type { Workstation } from '../types';

interface WorkstationsViewProps {
  workstations: Workstation[];
  onRefresh: () => void;
  onOpenReportFor: (workstationId: string) => void;
}

export function WorkstationsView({
  workstations,
  onRefresh,
  onOpenReportFor,
}: WorkstationsViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'attention'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [qrModal, setQrModal] = useState<{
    workstationId: string;
    reportUrl: string;
    dataUrl: string;
  } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [form, setForm] = useState({
    workstationId: '',
    hostname: '',
    labRoom: 'CSE Exam Lab 1',
    seatNumber: workstations.length + 1,
    ipAddress: `192.168.10.${101 + workstations.length}`,
    osVersion: 'Windows 11 Pro 23H2',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = workstations.filter((ws) => {
    const matchesSearch =
      ws.workstationId.toLowerCase().includes(search.toLowerCase()) ||
      ws.ipAddress.includes(search) ||
      ws.hostname.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'healthy') return ws.status === 'healthy';
    if (statusFilter === 'attention') return ws.status !== 'healthy';
    return true;
  });

  const handleOpenQr = async (wsId: string) => {
    setQrLoading(true);
    try {
      const data = await api.getWorkstationQr(wsId);
      setQrModal(data);
    } finally {
      setQrLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await api.addWorkstation({
        workstationId: form.workstationId,
        hostname: form.hostname || `${form.workstationId.toLowerCase()}.lab.local`,
        labRoom: form.labRoom,
        seatNumber: Number(form.seatNumber),
        ipAddress: form.ipAddress,
        osVersion: form.osVersion,
      });
      setShowAddModal(false);
      setForm({
        workstationId: '',
        hostname: '',
        labRoom: 'CSE Exam Lab 1',
        seatNumber: workstations.length + 2,
        ipAddress: `192.168.10.${102 + workstations.length}`,
        osVersion: 'Windows 11 Pro 23H2',
      });
      onRefresh();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (wsId: string) => {
    await api.deleteWorkstation(wsId);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Workstation Registry & QR Labels
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Register laboratory computers, inspect health metrics, and generate downloadable QR stickers
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Register Workstation
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workstation ID, IP, or hostname..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-700"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['all', 'healthy', 'attention'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === tab
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'all' ? 'All Nodes' : tab === 'healthy' ? 'Healthy' : 'Needs Attention'}
              </button>
            ))}
          </div>
        </div>

        {/* High-Density Registry Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-3">Workstation ID</th>
                <th className="py-2.5 px-3">IP & Room</th>
                <th className="py-2.5 px-3">OS</th>
                <th className="py-2.5 px-3">Health</th>
                <th className="py-2.5 px-3">Exam App</th>
                <th className="py-2.5 px-3 text-right">CPU</th>
                <th className="py-2.5 px-3 text-right">RAM</th>
                <th className="py-2.5 px-3 text-right">Disk</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-sm text-slate-500">
                    No matching workstations found.
                  </td>
                </tr>
              ) : (
                filtered.map((ws) => (
                  <tr key={ws.workstationId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {ws.workstationId}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-600">
                      <div className="font-mono tabular-nums">{ws.ipAddress}</div>
                      <div className="text-slate-400">
                        {ws.labRoom} · Seat {ws.seatNumber}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-600 whitespace-nowrap">
                      {ws.osVersion}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-medium whitespace-nowrap">
                      <span
                        className={
                          ws.status === 'healthy'
                            ? 'text-emerald-700'
                            : ws.status === 'failed'
                              ? 'text-red-700'
                              : 'text-amber-700'
                        }
                      >
                        {ws.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs font-mono whitespace-nowrap">
                      <span
                        className={
                          ws.examServiceStatus === 'running' ? 'text-emerald-700' : 'text-red-700'
                        }
                      >
                        {ws.examServiceStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs text-slate-800">
                      {ws.cpuPercent}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs text-slate-800">
                      {ws.memoryPercent}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs text-slate-800">
                      {ws.diskPercent}%
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenQr(ws.workstationId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          QR Code
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ws.workstationId)}
                          title={`Remove ${ws.workstationId}`}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Workstation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Register Laboratory Workstation
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Workstation ID
                </label>
                <input
                  required
                  value={form.workstationId}
                  onChange={(e) => setForm({ ...form, workstationId: e.target.value })}
                  placeholder="WS-LAB1-09"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    IP Address
                  </label>
                  <input
                    required
                    value={form.ipAddress}
                    onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Seat Number
                  </label>
                  <input
                    type="number"
                    required
                    value={form.seatNumber}
                    onChange={(e) => setForm({ ...form, seatNumber: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Lab Room
                </label>
                <input
                  required
                  value={form.labRoom}
                  onChange={(e) => setForm({ ...form, labRoom: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Operating System
                </label>
                <select
                  value={form.osVersion}
                  onChange={(e) => setForm({ ...form, osVersion: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                >
                  <option>Windows 11 Pro 23H2</option>
                  <option>Windows 10 Enterprise</option>
                  <option>Ubuntu 24.04 LTS</option>
                </select>
              </div>
              {formError && <p className="text-xs text-red-600">{formError}</p>}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-60"
                >
                  {submitting ? 'Registering...' : 'Register Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Sticker Modal */}
      {(qrModal || qrLoading) && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm p-6 text-center">
            {qrLoading || !qrModal ? (
              <div className="py-12 text-sm text-slate-500">Generating QR label...</div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {qrModal.workstationId}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQrModal(null)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Scan with a smartphone to open the workstation issue reporting page
                </p>
                <div className="inline-block p-3 border border-slate-200 rounded-xl bg-white">
                  <img
                    src={qrModal.dataUrl}
                    alt={`QR code for ${qrModal.workstationId}`}
                    className="w-52 h-52 mx-auto"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono text-slate-600 break-all">
                  {qrModal.reportUrl}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <a
                    href={`/api/workstations/${encodeURIComponent(qrModal.workstationId)}/qr?format=png`}
                    download={`${qrModal.workstationId}-QR.png`}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PNG
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const targetId = qrModal.workstationId;
                      setQrModal(null);
                      onOpenReportFor(targetId);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Test Scan Flow
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
