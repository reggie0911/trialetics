'use client';

import type { KriStatus } from '@/lib/types/ctms';

const statusColor: Record<KriStatus, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  red: 'bg-red-500',
};

const statusBorder: Record<KriStatus, string> = {
  green: 'border-green-200',
  yellow: 'border-yellow-200',
  red: 'border-red-200',
};

const statusBg: Record<KriStatus, string> = {
  green: 'bg-green-50',
  yellow: 'bg-yellow-50',
  red: 'bg-red-50',
};

const statusLabel: Record<KriStatus, string> = {
  green: 'On Track',
  yellow: 'At Risk',
  red: 'Critical',
};

interface KriGaugeProps {
  name: string;
  category: string;
  value: number;
  status: KriStatus;
  thresholdYellow?: number | null;
  thresholdRed?: number | null;
}

export function KriGauge({ name, category, value, status, thresholdYellow, thresholdRed }: KriGaugeProps) {
  return (
    <div className={`rounded-lg border p-3 ${statusBorder[status]} ${statusBg[status]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{name}</p>
          <p className="text-[10px] text-muted-foreground">{category}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className={`h-2.5 w-2.5 rounded-full ${statusColor[status]}`} />
          <span className="text-[10px] font-medium">{statusLabel[status]}</span>
        </div>
      </div>
      <div className="mt-2">
        <p className="text-lg font-semibold">{value.toFixed(1)}</p>
        {(thresholdYellow != null || thresholdRed != null) && (
          <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
            {thresholdYellow != null && <span>Yellow: ≥{thresholdYellow}</span>}
            {thresholdRed != null && <span>Red: ≥{thresholdRed}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

interface KriSummaryBarProps {
  green: number;
  yellow: number;
  red: number;
}

export function KriSummaryBar({ green, yellow, red }: KriSummaryBarProps) {
  const total = green + yellow + red;
  if (total === 0) return null;

  const greenPct = (green / total) * 100;
  const yellowPct = (yellow / total) * 100;
  const redPct = (red / total) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full overflow-hidden bg-muted flex">
        {greenPct > 0 && <div className="bg-green-500 h-full" style={{ width: `${greenPct}%` }} />}
        {yellowPct > 0 && <div className="bg-yellow-400 h-full" style={{ width: `${yellowPct}%` }} />}
        {redPct > 0 && <div className="bg-red-500 h-full" style={{ width: `${redPct}%` }} />}
      </div>
      <div className="flex items-center gap-1.5 text-[10px] shrink-0">
        <span className="flex items-center gap-0.5"><span className="h-2 w-2 rounded-full bg-green-500" />{green}</span>
        <span className="flex items-center gap-0.5"><span className="h-2 w-2 rounded-full bg-yellow-400" />{yellow}</span>
        <span className="flex items-center gap-0.5"><span className="h-2 w-2 rounded-full bg-red-500" />{red}</span>
      </div>
    </div>
  );
}
