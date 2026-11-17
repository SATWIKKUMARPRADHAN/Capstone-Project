import { useEffect, useState } from 'react';
import { Download, Menu, RotateCcw } from 'lucide-react';
import { api } from './lib/api';
import { getLabSocket } from './lib/socket';
import type { LabStateSnapshot, NavTab, Workstation } from './types';
import { Sidebar } from './components/Sidebar';
import { OverviewView } from './components/OverviewView';
import { WorkstationsView } from './components/WorkstationsView';
import { QrIssuePortalView } from './components/QrIssuePortalView';
import { ExamAppView } from './components/ExamAppView';
import { AutomationDevOpsView } from './components/AutomationDevOpsView';
import { AnomalyAnalyticsView } from './components/AnomalyAnalyticsView';
import { DeliverablesDocsView } from './components/DeliverablesDocsView';
import { WorkstationDetailModal } from './components/WorkstationDetailModal';

const TAB_TITLES: Record<NavTab, string> = {
  overview: 'Lab Overview',
  workstations: 'Workstations & QR',
  report: 'QR Issue Portal',
  exam: 'Examination App',
  automation: 'Automation & DevOps',
  analytics: 'Anomaly Analytics',
  deliverables: 'Deliverables & ZIP',
};

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const initialView = (params.get('view') as NavTab) || 'overview';
  const initialWs = params.get('ws') || '';

  const [activeTab, setActiveTab] = useState<NavTab>(
    TAB_TITLES[initialView] ? initialView : 'overview'
  );
  const [reportTargetWs, setReportTargetWs] = useState<string>(initialWs);
  const [state, setState] = useState<LabStateSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inspectedWs, setInspectedWs] = useState<Workstation | null>(null);

  const fetchState = async () => {
    try {
      const snap = await api.getState();
      setState(snap);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    const socket = getLabSocket();
    const onState = (snapshot: LabStateSnapshot) => {
      setState(snapshot);
      setLoading(false);
    };
    socket.on('lab:state', onState);
    return () => {
      socket.off('lab:state', onState);
    };
  }, []);

  const openIncidents = state?.incidents.filter((i) => i.status !== 'resolved').length ?? 0;
  const openReports = state?.issueReports.filter((r) => r.status !== 'resolved').length ?? 0;

  const handleOpenReportFor = (workstationId: string) => {
    setReportTargetWs(workstationId);
    setActiveTab('report');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        openIncidentCount={openIncidents}
        openReportCount={openReports}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on Left, Concise Primary Action on Right */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between gap-8 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="font-semibold text-slate-900 whitespace-nowrap">LabGuard</span>
              <span className="text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="text-slate-600 truncate">{TAB_TITLES[activeTab]}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => api.resetState().then(setState)}
              title="Reset demonstration dataset"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Demo
            </button>
            <button
              type="button"
              onClick={() => api.downloadProjectZip()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Download ZIP
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 max-w-[1440px] w-full mx-auto">
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
              Synchronizing laboratory telemetry...
            </div>
          ) : error || !state ? (
            <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-3">
              <div className="text-sm font-medium text-red-700">
                Unable to connect to LabGuard backend ({error || 'Unknown error'})
              </div>
              <button
                type="button"
                onClick={fetchState}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewView
                  state={state}
                  onSelectTab={setActiveTab}
                  onInspectWorkstation={setInspectedWs}
                  onTriggerRecovery={(incidentId, playbook) =>
                    api.executeRecovery({ incidentId, playbook })
                  }
                  onResolveReport={(reportId) => api.resolveReport(reportId)}
                  onEnforcePuppet={(wsId) => api.enforcePuppet(wsId)}
                />
              )}

              {activeTab === 'workstations' && (
                <WorkstationsView
                  workstations={state.workstations}
                  onRefresh={fetchState}
                  onOpenReportFor={handleOpenReportFor}
                />
              )}

              {activeTab === 'report' && (
                <QrIssuePortalView
                  workstations={state.workstations}
                  initialWorkstationId={reportTargetWs}
                  recentReports={state.issueReports}
                  onSubmitted={fetchState}
                />
              )}

              {activeTab === 'exam' && (
                <ExamAppView
                  workstations={state.workstations}
                  examGlobalHealthy={state.examGlobalHealthy}
                  submissions={state.examSubmissions}
                />
              )}

              {activeTab === 'automation' && (
                <AutomationDevOpsView state={state} onRefresh={fetchState} />
              )}

              {activeTab === 'analytics' && <AnomalyAnalyticsView />}

              {activeTab === 'deliverables' && <DeliverablesDocsView />}
            </>
          )}
        </main>
      </div>

      <WorkstationDetailModal
        workstation={inspectedWs}
        onClose={() => setInspectedWs(null)}
        onInjectFault={(workstationId, faultType, autoRecover) =>
          api.injectFault({ workstationId, faultType, autoRecover })
        }
        onEnforcePuppet={(workstationId) => api.enforcePuppet(workstationId)}
        onOpenReportFor={handleOpenReportFor}
      />
    </div>
  );
}
