'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ResourceForecast } from '@/lib/types/resources';

function protocolName(item: ResourceForecast) {
  const p = item.protocol;
  if (!p) return item.protocol_id ?? '—';
  return p.title ?? p.protocol_number ?? item.protocol_id ?? '—';
}

function periodLabel(item: ResourceForecast) {
  const start = new Date(item.forecast_period_start).toLocaleDateString();
  const end = new Date(item.forecast_period_end).toLocaleDateString();
  return `${start} – ${end}`;
}

interface ResourceForecastTableProps {
  items: ResourceForecast[];
  isLoading: boolean;
}

export function ResourceForecastTable({ items, isLoading }: ResourceForecastTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Protocol</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Needed FTE</TableHead>
            <TableHead>Filled FTE</TableHead>
            <TableHead>Gap FTE</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No forecasts
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{protocolName(item)}</TableCell>
                <TableCell>{item.role}</TableCell>
                <TableCell>{item.needed_fte}</TableCell>
                <TableCell>{item.filled_fte}</TableCell>
                <TableCell
                  className={cn(
                    item.gap_fte > 0 && 'text-destructive font-medium'
                  )}
                >
                  {item.gap_fte}
                </TableCell>
                <TableCell>{periodLabel(item)}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {item.notes ?? '—'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
