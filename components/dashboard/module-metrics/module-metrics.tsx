'use client';

import { MetricCard } from './metric-card';
import type { DashboardModuleMetric } from '@/lib/types/dashboard-metrics';

interface ModuleMetricsProps {
  metrics: DashboardModuleMetric[];
}

export function ModuleMetrics({ metrics }: ModuleMetricsProps) {
  return (
    <div className="w-full">
      <h2 className="text-lg font-semibold mb-4">Module Metrics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
    </div>
  );
}
