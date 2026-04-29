'use client';

import type { ComponentType, ReactNode } from 'react';
import { Info } from 'lucide-react';

import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  title: string;
  value: string;
  meta: string;
  metaIcon?: ComponentType<{ className?: string }>;
  tooltip?: string;
  icon: ComponentType<{ className?: string }>;
  accentClassName: string;
  topAccentClassName?: string;
  progressClassName: string;
  progressPct?: number | null;
  progressCurrentLabel?: string;
  progressTotalLabel?: string;
  progressLabelClassName?: string;
  sparkline?: ReactNode;
  onClick?: () => void;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function StatCard({
  title,
  value,
  meta,
  metaIcon: MetaIcon,
  tooltip,
  icon: Icon,
  accentClassName,
  topAccentClassName,
  progressClassName,
  progressPct,
  progressCurrentLabel,
  progressTotalLabel,
  progressLabelClassName,
  sparkline,
  onClick,
}: StatCardProps) {
  const ResolvedMetaIcon = MetaIcon ?? Info;

  const bodyClass = cn(
    'flex h-full w-full flex-col text-left',
    onClick
      ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60'
      : undefined,
  );

  const inner = (
    <div className="relative flex h-full w-full flex-col">
      {onClick || tooltip ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 origin-center scale-0 rounded-[5px] bg-primary/[0.07] opacity-0 transition-[transform,opacity] duration-300 ease-out group-hover:scale-100 group-hover:opacity-100"
        />
      ) : null}

      {topAccentClassName ? (
        <div className={cn('relative z-10 h-[3px] w-full shrink-0', topAccentClassName)} />
      ) : null}

      <div className="relative z-10 flex h-full flex-1 flex-col gap-0 px-4 py-3.5">
        {/* KPI header: label + value (left) · icon (right) */}
        <div className="flex w-full min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5 text-left">
            <p
              data-slot="stat-card-title"
              className="!text-[12px] font-medium leading-tight text-muted-foreground"
            >
              {title}
            </p>
            <p className="min-w-0 break-words text-left !text-[30px] font-medium leading-[1.05] tracking-tight text-foreground tabular-nums">
              {value}
            </p>
          </div>
          <span
            className={cn(
              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10',
              accentClassName,
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" />
          </span>
        </div>

        <div className="mt-3 flex w-full min-w-0 flex-col">
          <div className="flex w-full justify-start">
            <span
              className={cn(
                'inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-[#ffffff] px-2.5 py-1 text-[11px] font-medium text-[#000000] dark:border-neutral-200 dark:bg-[#ffffff] dark:text-[#000000]',
              )}
            >
              <ResolvedMetaIcon className="h-3 w-3 shrink-0 text-[#000000] opacity-80" />
              <span className="truncate">{meta}</span>
            </span>
          </div>
        </div>

        <div className="mt-auto min-h-0 pt-1">
          {sparkline ? (
            sparkline
          ) : (
            <div className="space-y-1.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80">
                <div
                  className={cn('h-1.5 min-w-0 rounded-full', progressClassName)}
                  style={{ width: `${clampPercent(progressPct ?? 100)}%` }}
                />
              </div>
              {progressCurrentLabel || progressTotalLabel ? (
                <div className="flex w-full flex-wrap items-baseline justify-start gap-x-2 gap-y-0.5 text-left text-[11px]">
                  {progressCurrentLabel ? (
                    <span
                      className={cn(
                        'font-medium',
                        progressLabelClassName ?? 'text-foreground',
                      )}
                    >
                      {progressCurrentLabel}
                    </span>
                  ) : null}
                  {progressTotalLabel ? (
                    <span className="font-medium text-muted-foreground">
                      {progressTotalLabel}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Card
      className={cn(
        'h-full overflow-hidden border-border/70 py-0',
        (onClick || tooltip) && 'group',
        onClick && 'cursor-pointer',
      )}
    >
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger
            render={
              onClick ? (
                <button
                  type="button"
                  onClick={onClick}
                  className={bodyClass}
                />
              ) : (
                <div className={bodyClass} />
              )
            }
          >
            {inner}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={bodyClass}>
          {inner}
        </button>
      ) : (
        <div className={bodyClass}>{inner}</div>
      )}
    </Card>
  );
}

export interface SparklineProps {
  data: number[];
  className?: string;
  strokeClassName?: string;
  fillClassName?: string;
  pointClassName?: string;
}

export function Sparkline({
  data,
  className,
  strokeClassName = 'stroke-cyan-500',
  fillClassName = 'fill-cyan-500/15',
  pointClassName = 'fill-cyan-500',
}: SparklineProps) {
  if (data.length === 0) return null;

  const width = 220;
  const height = 56;
  const padX = 4;
  const padY = 6;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = (width - padX * 2) / Math.max(data.length - 1, 1);

  const points = data.map((v, i) => {
    const x = padX + i * stepX;
    const y = padY + (1 - (v - min) / range) * (height - padY * 2);
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');

  const firstX = points[0][0];
  const lastX = points[points.length - 1][0];
  const areaPath = `${path} L${lastX.toFixed(2)},${height - padY} L${firstX.toFixed(2)},${height - padY} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('h-14 w-full', className)}
      role="img"
      aria-hidden="true"
    >
      <path d={areaPath} className={fillClassName} />
      <path
        d={path}
        className={strokeClassName}
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.6} className={pointClassName} />
      ))}
    </svg>
  );
}
