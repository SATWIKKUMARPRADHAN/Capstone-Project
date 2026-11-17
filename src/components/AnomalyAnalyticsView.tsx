import { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import type { AnomalyAnalysisResult } from '../types';
import { TelemetryChart } from './TelemetryChart';

export function AnomalyAnalyticsView() {
  const [contamination, setContamination] = useState(0.08);
  const [analysis, setAnalysis] = useState<AnomalyAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  const runAnalysis = async (rate: number) => {
    setLoading(true);
    try {
      const res = await api.analyzeAnomalies(rate);
      setAnalysis(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis(contamination);
  }, [contamination]);

  const anomalies = analysis?.results.filter((r) => r.isAnomaly) ?? [];

  return (
    <div className="space-y-6">
      {/* Model Controls & KPI Strip */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Isolation Forest Anomaly Detection (Scikit-learn Compatible)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Unsupervised multi-variate anomaly scoring across CPU %, Memory %, Disk %, and Exam Latency (ms)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => runAnalysis(contamination)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Re-Score Dataset
            </button>
            <a
              href="/api/ml/export-csv"
              download="labguard-telemetry-dataset.csv"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </a>
          </div>
        </div>

        <div className="pt-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="md:col-span-2 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-2">
              <span>Contamination Hyperparameter</span>
              <span className="font-mono tabular-nums font-bold text-blue-700">
                {(contamination * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0.04}
              max={0.25}
              step={0.01}
              value={contamination}
              onChange={(e) => setContamination(Number(e.target.value))}
              className="w-full accent-blue-700"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>Strict (4%)</span>
              <span>Balanced (8%)</span>
              <span>Sensitive (25%)</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-xs text-slate-500">Observations Analyzed</div>
            <div className="font-mono tabular-nums text-xl font-bold text-slate-900 mt-1">
              {analysis?.total ?? 0}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              Cutoff Score ≥ {analysis?.thresholdScore ?? 0.6}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-xs text-slate-500">Flagged Anomalies</div>
            <div className="font-mono tabular-nums text-xl font-bold text-red-700 mt-1">
              {analysis?.anomaliesFound ?? 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Avg CPU {analysis?.featureMeans.cpuPercent ?? 0}% · Latency{' '}
              {analysis?.featureMeans.examLatencyMs ?? 0}ms
            </div>
          </div>
        </div>
      </section>

      {analysis && (
        <TelemetryChart
          metrics={analysis.results}
          title="Scored Telemetry Vector Timeline"
        />
      )}

      {/* Flagged Anomalies Table */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-display text-base font-semibold text-slate-900">
          Isolation Forest Flagged Behavior Alerts
        </h3>
        <p className="text-xs text-slate-500 mt-0.5 mb-4">
          Records isolated with shortest average decision tree path lengths (dominant z-score feature attributed)
        </p>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-2.5 px-3">Workstation</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3 text-right">CPU %</th>
                <th className="py-2.5 px-3 text-right">Memory %</th>
                <th className="py-2.5 px-3 text-right">Disk %</th>
                <th className="py-2.5 px-3 text-right">Exam Latency</th>
                <th className="py-2.5 px-3">Dominant Feature</th>
                <th className="py-2.5 px-3 text-right">Anomaly Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
              {anomalies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center font-sans text-slate-500">
                    No observations exceeded the anomaly threshold at this contamination setting.
                  </td>
                </tr>
              ) : (
                anomalies
                  .sort((a, b) => b.anomalyScore - a.anomalyScore)
                  .map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {item.workstationId}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-800">{item.cpuPercent}%</td>
                      <td className="py-2.5 px-3 text-right text-slate-800">
                        {item.memoryPercent}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-800">{item.diskPercent}%</td>
                      <td className="py-2.5 px-3 text-right text-slate-800">
                        {item.examLatencyMs}ms
                      </td>
                      <td className="py-2.5 px-3 text-amber-800 font-medium">
                        {item.dominantFeature}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-red-700">
                        {item.anomalyScore.toFixed(4)}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
