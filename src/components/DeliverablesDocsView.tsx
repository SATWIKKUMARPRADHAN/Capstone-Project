import { useEffect, useState } from 'react';
import { Download, FileCode2, FolderTree } from 'lucide-react';
import { api } from '../lib/api';

export function DeliverablesDocsView() {
  const [files, setFiles] = useState<{ path: string; content: string }[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('README.md');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getProjectFiles()
      .then((res) => {
        setFiles(res.files);
        if (res.files.length > 0) {
          setSelectedPath(res.files[0].path);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedFile = files.find((f) => f.path === selectedPath);

  return (
    <div className="space-y-6">
      {/* Top Download Banner */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-xl font-bold text-slate-900">
            Complete B.Tech CSE Capstone Source & DevOps Repository
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Download the complete locally deployable project archive containing the React + Tailwind frontend, Express + Socket.IO backend, MongoDB Mongoose schemas, Nagios Core configs, Ansible recovery playbooks, Puppet manifests, Terraform IaC, Docker Compose stack, Windows PowerShell collectors, Python Scikit-learn ML module, and full documentation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => api.downloadProjectZip()}
          className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" />
          Download Complete Project ZIP
        </button>
      </section>

      {/* Architecture Flow Summary */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-display text-base font-semibold text-slate-900 mb-3">
          End-to-End Self-Healing Pipeline
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {[
            {
              step: '01. QR & Nagios Detection',
              desc: 'Smartphone QR scan or Nagios check_http / check_nrpe HARD CRITICAL alert.',
            },
            {
              step: '02. Node.js Triage',
              desc: 'Express correlates workstation ID and maps fault to approved remediation.',
            },
            {
              step: '03. Ansible Recovery',
              desc: 'WinRM executes idempotent YAML playbook (restart service, purge temp, reset DNS).',
            },
            {
              step: '04. Puppet & Verification',
              desc: 'Puppet restores kiosk drift; Nagios verifies HTTP 200 OK post-recovery.',
            },
            {
              step: '05. Isolation Forest ML',
              desc: 'Python Scikit-learn scores multi-feature telemetry to catch early anomalies.',
            },
          ].map((item) => (
            <div key={item.step} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="font-display font-semibold text-slate-900">{item.step}</div>
              <p className="text-slate-600 mt-1 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live Repository File Explorer */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[480px]">
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50 p-3 overflow-y-auto max-h-[540px]">
          <div className="flex items-center gap-2 px-2 py-2 text-xs font-semibold text-slate-700">
            <FolderTree className="w-4 h-4 text-blue-700" />
            Project Files ({files.length})
          </div>
          {loading ? (
            <div className="p-4 text-xs text-slate-500">Loading repository files...</div>
          ) : (
            <div className="space-y-0.5">
              {files.map((f) => (
                <button
                  key={f.path}
                  type="button"
                  onClick={() => setSelectedPath(f.path)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md font-mono text-xs truncate transition-colors ${
                    selectedPath === f.path
                      ? 'bg-blue-700 text-white font-medium'
                      : 'text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  {f.path}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-8 flex flex-col max-h-[540px]">
          <div className="px-4 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between">
            <span className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-slate-900">
              <FileCode2 className="w-4 h-4 text-slate-500" />
              {selectedPath}
            </span>
          </div>
          <pre className="flex-1 p-4 bg-slate-900 text-slate-100 text-xs font-mono overflow-auto leading-relaxed">
            {selectedFile?.content || 'Select a file from the tree to inspect its source.'}
          </pre>
        </div>
      </section>
    </div>
  );
}
