'use client';

import { mockModuleMetrics } from '@/lib/mock-data/module-metrics';
import { MetricCard } from './metric-card';

export function ModuleMetrics() {
  return (
    <div className="w-full">
      <h2 className="text-lg font-semibold mb-4">Module Metrics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {mockModuleMetrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
    </div>
  );
}
