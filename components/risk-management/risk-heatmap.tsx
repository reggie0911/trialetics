'use client';

import type { RiskHeatmapCell } from '@/lib/types/risk-management';
import { RISK_STATUS_LABELS } from '@/lib/types/risk-management';

interface RiskHeatmapProps {
  data: RiskHeatmapCell[];
}

const cellColor = (likelihood: number, impact: number): string => {
  const score = likelihood * impact;
  if (score >= 15) return 'bg-red-200 hover:bg-red-300';
  if (score >= 10) return 'bg-orange-200 hover:bg-orange-300';
  if (score >= 5) return 'bg-yellow-200 hover:bg-yellow-300';
  return 'bg-green-200 hover:bg-green-300';
};

export function RiskHeatmap({ data }: RiskHeatmapProps) {
  const cellMap = new Map<string, RiskHeatmapCell>();
  for (const cell of data) {
    cellMap.set(`${cell.likelihood}-${cell.impact}`, cell);
  }

  const impactLabels = ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'];
  const likelihoodLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];

  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-4 text-sm font-medium">Risk Heatmap (Likelihood x Impact)</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="p-2 text-xs text-muted-foreground text-left w-28">
                Likelihood / Impact
              </th>
              {impactLabels.map((label, i) => (
                <th key={i} className="p-2 text-xs text-center font-medium">
                  {i + 1} - {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[5, 4, 3, 2, 1].map((likelihood) => (
              <tr key={likelihood}>
                <td className="p-2 text-xs font-medium">
                  {likelihood} - {likelihoodLabels[likelihood - 1]}
                </td>
                {[1, 2, 3, 4, 5].map((impact) => {
                  const cell = cellMap.get(`${likelihood}-${impact}`);
                  return (
                    <td key={impact} className="p-1">
                      <div
                        className={`flex min-h-[60px] flex-col items-center justify-center rounded p-2 transition-colors ${
                          cell ? cellColor(likelihood, impact) : 'bg-gray-50'
                        }`}
                      >
                        {cell ? (
                          <>
                            <span className="text-lg font-bold">{cell.count}</span>
                            <div className="mt-1 space-y-0.5">
                              {cell.risks.slice(0, 3).map((r) => (
                                <p key={r.id} className="text-[10px] leading-tight truncate max-w-[100px]">
                                  {r.title}
                                </p>
                              ))}
                              {cell.risks.length > 3 && (
                                <p className="text-[10px] text-muted-foreground">
                                  +{cell.risks.length - 3} more
                                </p>
                              )}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-green-200" />
          <span>Low (1-4)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-yellow-200" />
          <span>Medium (5-9)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-orange-200" />
          <span>High (10-14)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-red-200" />
          <span>Critical (15-25)</span>
        </div>
      </div>
    </div>
  );
}
