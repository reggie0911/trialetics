import { MetricStatus } from '@/lib/types/module-metrics';
import { cn } from '@/lib/utils';

interface MetricProgressBarProps {
  status: MetricStatus;
}

export function MetricProgressBar({ status }: MetricProgressBarProps) {
  const statusColors = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  };

  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={cn('h-full w-full', statusColors[status])} />
    </div>
  );
}
