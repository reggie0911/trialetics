import { ModuleMetric } from '@/lib/types/module-metrics';
import { MetricProgressBar } from './metric-progress-bar';
import { MetricStat } from './metric-stat';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface MetricCardProps {
  metric: ModuleMetric;
}

export function MetricCard({ metric }: MetricCardProps) {
  const gridCols = metric.stats.length <= 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="bg-card border border-input rounded-lg p-3 hover:shadow-md transition-shadow duration-200">
      <div className="space-y-2">
        {/* Title */}
        <h3 className="text-sm font-semibold text-foreground leading-tight">
          {metric.title}
        </h3>

        {/* Progress Bar */}
        <MetricProgressBar status={metric.status} />

        {/* Stats Grid */}
        <div className={`grid ${gridCols} gap-2 py-2`}>
          {metric.stats.map((stat, index) => (
            <MetricStat key={index} stat={stat} />
          ))}
        </div>

        {/* See Details Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-[10px] font-medium"
          asChild
        >
          <a href={metric.detailsLink}>
            <ExternalLink className="h-3 w-3 mr-1" />
            See Details
          </a>
        </Button>
      </div>
    </div>
  );
}
