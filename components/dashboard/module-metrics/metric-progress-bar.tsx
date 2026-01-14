import { MetricStatus } from '@/lib/types/module-metrics';

interface MetricProgressBarProps {
  status: MetricStatus;
}

export function MetricProgressBar({ status }: MetricProgressBarProps) {
  const statusColors = {
    success: '#17B890',
    warning: '#EAB308',
    danger: '#F70000',
  };

  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div className="h-full w-full" style={{ backgroundColor: statusColors[status] }} />
    </div>
  );
}
