import { MetricStat as MetricStatType } from '@/lib/types/module-metrics';
import { cn } from '@/lib/utils';

interface MetricStatProps {
  stat: MetricStatType;
}

export function MetricStat({ stat }: MetricStatProps) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-muted-foreground text-center leading-tight mb-1 h-6 flex items-center justify-center">
        {stat.label}
      </span>
      <div className="flex items-center gap-0.5">
        <span
          className={cn(
            'text-base font-bold',
            stat.highlight && 'text-destructive'
          )}
        >
          {stat.value}
        </span>
        {stat.delta !== undefined && (
          <span className="text-[10px] text-destructive font-semibold">
            Δ
          </span>
        )}
      </div>
    </div>
  );
}
