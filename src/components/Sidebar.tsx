import {
  Activity,
  BrainCircuit,
  ClipboardCheck,
  FileArchive,
  LayoutGrid,
  Monitor,
  QrCode,
  Terminal,
} from 'lucide-react';
import type { NavTab } from '../types';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  openIncidentCount: number;
  openReportCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: NavTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Lab Overview', icon: LayoutGrid },
  { id: 'workstations', label: 'Workstations & QR', icon: Monitor },
  { id: 'report', label: 'QR Issue Portal', icon: QrCode },
  { id: 'exam', label: 'Examination App', icon: ClipboardCheck },
  { id: 'automation', label: 'Automation & DevOps', icon: Terminal },
  { id: 'analytics', label: 'Anomaly Analytics', icon: BrainCircuit },
  { id: 'deliverables', label: 'Deliverables & ZIP', icon: FileArchive },
];

export function Sidebar({
  activeTab,
  onSelectTab,
  openIncidentCount,
  openReportCount,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-14 px-5 border-b border-slate-200 flex items-center gap-2.5 shrink-0">
          <Activity className="w-5 h-5 text-blue-700 shrink-0" />
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            LabGuard
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const count =
              item.id === 'automation'
                ? openIncidentCount
                : item.id === 'report'
                  ? openReportCount
                  : 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-700 ${
                  isActive
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-500'}`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {count > 0 && (
                  <span className="font-mono tabular-nums text-xs font-semibold text-amber-700">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
          <div className="font-medium text-slate-700">CSE Exam Lab 1</div>
          <div>Nagios · Ansible · Puppet · ML</div>
        </div>
      </aside>
    </>
  );
}
