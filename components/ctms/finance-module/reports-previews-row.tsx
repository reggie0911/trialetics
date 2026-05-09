'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportPreviewItem {
  id: string;
  title: string;
  description: string;
  preview: 'bar' | 'line' | 'donut';
}

interface ReportsPreviewsRowProps {
  items?: ReportPreviewItem[];
}

const DEFAULT_ITEMS: ReportPreviewItem[] = [
  {
    id: 'budget-variance',
    title: 'Budget Variance',
    description: 'Approved vs actual spend across active categories.',
    preview: 'bar',
  },
  {
    id: 'site-payment-status',
    title: 'Site Payment Status',
    description: 'Milestone earned, approved, paid, and held breakdown.',
    preview: 'donut',
  },
  {
    id: 'forecast-curve',
    title: 'Forecast Curve',
    description: 'Cumulative actual vs forecast vs approved budget over time.',
    preview: 'line',
  },
];

function PreviewBlock({ kind }: { kind: ReportPreviewItem['preview'] }) {
  if (kind === 'bar') {
    return (
      <div className="flex h-16 items-end gap-1">
        {[0.4, 0.6, 0.55, 0.7, 0.85, 0.65, 0.9].map((v, idx) => (
          <div
            key={idx}
            className="flex-1 rounded-sm bg-primary/60"
            style={{ height: `${v * 100}%` }}
            aria-hidden
          />
        ))}
      </div>
    );
  }
  if (kind === 'line') {
    return (
      <svg viewBox="0 0 100 50" className="h-16 w-full" aria-hidden>
        <path
          d="M0 40 L15 35 L30 32 L45 28 L60 22 L75 18 L100 10"
          fill="none"
          stroke="oklch(0.65 0.18 145)"
          strokeWidth="1.5"
        />
        <path
          d="M0 45 L15 42 L30 38 L45 34 L60 30 L75 26 L100 18"
          fill="none"
          stroke="oklch(0.7 0.13 220)"
          strokeWidth="1.5"
          strokeDasharray="2,1.5"
        />
      </svg>
    );
  }
  return (
    <div
      className="size-16 mx-auto rounded-full"
      style={{
        background:
          'conic-gradient(oklch(0.65 0.18 145) 0% 30%, oklch(0.7 0.13 220) 30% 55%, oklch(0.78 0.16 80) 55% 75%, oklch(0.6 0.18 15) 75% 100%)',
      }}
      aria-hidden
    />
  );
}

export function ReportsPreviewsRow({ items = DEFAULT_ITEMS }: ReportsPreviewsRowProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <CardDescription className="text-[11px]">{item.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <PreviewBlock kind={item.preview} />
            <button
              type="button"
              className="mt-2 text-[11px] text-primary hover:underline"
              disabled
            >
              View Sample →
            </button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
