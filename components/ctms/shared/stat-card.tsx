'use client';

import type { ComponentType, ReactNode } from 'react';
import { Info, MoreHorizontal } from 'lucide-react';

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
  detail?: string;
  detailHasInfo?: boolean;
  detailValue?: string;
  tooltip?: string;
  icon: ComponentType<{ className?: string }>;
  accentClassName: string;
  topAccentClassName?: string;
  pillClassName?: string;
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
  detail,
  detailHasInfo,
  detailValue,
  tooltip,
  icon: Icon,
  accentClassName,
  topAccentClassName,
  pillClassName,
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
    <div className="flex h-full w-full flex-col">
      {topAccentClassName ? (
        <div className={cn('h-[3px] w-full shrink-0', topAccentClassName)} />
      ) : null}

      <div className="flex h-full flex-1 flex-col gap-3 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                accentClassName,
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <p className="text-[11px] font-semibold uppercase leading-tight tracking-[0.08em] text-muted-foreground">
              {title}
            </p>
          </div>
          <span
            className="text-muted-foreground/70"
            aria-hidden="true"
          >
            <MoreHorizontal className="h-4 w-4" />
          </span>
        </div>

        <p className="text-3xl font-medium tracking-tight text-foreground">
          {value}
        </p>

        <div>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              pillClassName ?? 'bg-muted text-muted-foreground',
            )}
          >
            <ResolvedMetaIcon className="h-3.5 w-3.5" />
            {meta}
          </span>
        </div>

        {detail || detailValue ? (
          <div className="space-y-0.5 border-t border-border/60 pt-3">
            {detail ? (
              <div className="flex items-center gap-1.5 text-xs text-foreground/85">
                <span className="truncate">{detail}</span>
                {detailHasInfo ? (
                  <Info className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                ) : null}
              </div>
            ) : null}
            {detailValue ? (
              <p className="truncate text-xs text-muted-foreground">
                {detailValue}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto pt-2">
          {sparkline ? (
            sparkline
          ) : (
            <div className="space-y-2">
              <div className="h-1.5 rounded-sm bg-muted">
                <div
                  className={cn('h-1.5 rounded-sm', progressClassName)}
                  style={{ width: `${clampPercent(progressPct ?? 100)}%` }}
                />
              </div>
              {progressCurrentLabel || progressTotalLabel ? (
                <div className="flex items-center justify-between text-[11px]">
                  <span
                    className={cn(
                      'font-medium',
                      progressLabelClassName ?? 'text-foreground',
                    )}
                  >
                    {progressCurrentLabel}
                  </span>
                  <span className="font-medium text-muted-foreground">
                    {progressTotalLabel}
                  </span>
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
        onClick ? 'transition-colors hover:bg-muted/20' : undefined,
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
