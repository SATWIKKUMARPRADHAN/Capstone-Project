import { useMemo, useState } from 'react';
import type { MetricLog } from '../types';

interface TelemetryChartProps {
  metrics: MetricLog[];
  title?: string;
}

export function TelemetryChart({ metrics, title = 'Telemetry & Anomaly Timeline' }: TelemetryChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const recent = useMemo(() => metrics.slice(-40), [metrics]);

  const width = 760;
  const height = 220;
  const padLeft = 38;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 26;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const toX = (idx: number) =>
    recent.length <= 1 ? padLeft : padLeft + (idx / (recent.length - 1)) * innerW;
  const toY = (val: number) => padTop + innerH - (Math.min(100, Math.max(0, val)) / 100) * innerH;

  const cpuPath = useMemo(() => {
    if (recent.length === 0) return '';
    return recent
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(pt.cpuPercent).toFixed(1)}`)
      .join(' ');
  }, [recent]);

  const memPath = useMemo(() => {
    if (recent.length === 0) return '';
    return recent
      .map(
        (pt, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(pt.memoryPercent).toFixed(1)}`
      )
      .join(' ');
  }, [recent]);

  const hovered = hoveredIdx !== null ? recent[hoveredIdx] : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="font-display text-base font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Last {recent.length} workstation telemetry observations · Isolation Forest anomaly markers
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-700 inline-block" />
            CPU %
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-slate-400 inline-block" />
            Memory %
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
            ML Anomaly
          </span>
        </div>
      </div>

      {recent.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-slate-500">
          No telemetry samples recorded yet.
        </div>
      ) : (
        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-56 select-none"
            role="img"
            aria-label="Workstation CPU and Memory Telemetry Chart"
          >
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = toY(tick);
              return (
                <g key={tick}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-400 text-[10px] font-mono"
                  >
                    {tick}%
                  </text>
                </g>
              );
            })}

            <path d={memPath} fill="none" stroke="#94a3b8" strokeWidth={1.75} />
            <path d={cpuPath} fill="none" stroke="#1d4ed8" strokeWidth={2.25} />

            {recent.map((pt, idx) => {
              const x = toX(idx);
              const y = toY(pt.cpuPercent);
              return (
                <g key={pt.id}>
                  {pt.isAnomaly && (
                    <circle
                      cx={x}
                      cy={y}
                      r={5}
                      fill="#dc2626"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  )}
                  <rect
                    x={x - 8}
                    y={padTop}
                    width={16}
                    height={innerH}
                    fill="transparent"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                </g>
              );
            })}

            {hovered && hoveredIdx !== null && (
              <line
                x1={toX(hoveredIdx)}
                y1={padTop}
                x2={toX(hoveredIdx)}
                y2={height - padBottom}
                stroke="#cbd5e1"
                strokeWidth={1}
              />
            )}
          </svg>

          {hovered && (
            <div className="mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-4 text-xs">
              <span className="font-mono font-semibold text-slate-900">{hovered.workstationId}</span>
              <span className="font-mono tabular-nums text-slate-700">
                CPU {hovered.cpuPercent}% · RAM {hovered.memoryPercent}% · Disk {hovered.diskPercent}% · Latency {hovered.examLatencyMs}ms
              </span>
              <span
                className={`font-mono font-medium ${
                  hovered.isAnomaly ? 'text-red-600' : 'text-emerald-700'
                }`}
              >
                {hovered.isAnomaly
                  ? `Anomaly (Score ${hovered.anomalyScore} · ${hovered.dominantFeature})`
                  : `Normal (Score ${hovered.anomalyScore})`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
