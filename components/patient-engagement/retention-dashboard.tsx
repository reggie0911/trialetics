'use client';

import type { RetentionDashboardData } from '@/lib/types/patient-engagement';

interface RetentionDashboardProps {
  data: RetentionDashboardData;
}

function StatCard({ label, value, variant }: { label: string; value: string | number; variant?: string }) {
  const colorMap: Record<string, string> = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
    default: '',
  };
  return (
    <div className="rounded-lg border bg-white p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold ${colorMap[variant || 'default'] || ''}`}>{value}</p>
    </div>
  );
}

export function RetentionDashboard({ data }: RetentionDashboardProps) {
  const retentionPct = data.retention_rate ? `${data.retention_rate.toFixed(1)}%` : '—';

  return (
    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-7">
      <StatCard label="Enrolled" value={data.total_enrolled} />
      <StatCard label="Active" value={data.total_active} variant="success" />
      <StatCard label="Completed" value={data.total_completed} variant="success" />
      <StatCard label="Withdrawn" value={data.total_withdrawn} variant="danger" />
      <StatCard label="Retention Rate" value={retentionPct} variant={data.retention_rate >= 80 ? 'success' : 'warning'} />
      <StatCard label="At Risk" value={data.at_risk_count} variant="warning" />
      <StatCard label="Open Flags" value={data.open_risk_flags} variant={data.open_risk_flags > 0 ? 'danger' : 'default'} />
    </div>
  );
}
