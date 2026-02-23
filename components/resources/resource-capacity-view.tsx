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
import type { ResourceCapacity } from '@/lib/types/resources';

function profileName(item: ResourceCapacity) {
  const p = item.profile;
  if (!p) return item.profile_id;
  const parts = [p.first_name, p.last_name].filter(Boolean);
  return parts.length ? parts.join(' ') : item.profile_id;
}

function periodLabel(item: ResourceCapacity) {
  const start = new Date(item.period_start).toLocaleDateString();
  const end = new Date(item.period_end).toLocaleDateString();
  return `${start} – ${end}`;
}

function utilizationColor(pct: number) {
  if (pct > 90) return 'text-destructive font-medium';
  if (pct >= 70) return 'text-yellow-600 dark:text-yellow-500';
  return 'text-green-600 dark:text-green-500';
}

interface ResourceCapacityViewProps {
  items: ResourceCapacity[];
  isLoading: boolean;
}

export function ResourceCapacityView({ items, isLoading }: ResourceCapacityViewProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Staff Member</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Available Hours</TableHead>
            <TableHead>Allocated Hours</TableHead>
            <TableHead>Utilization %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 5 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No capacity data
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{profileName(item)}</TableCell>
                <TableCell>{periodLabel(item)}</TableCell>
                <TableCell>{item.available_hours}</TableCell>
                <TableCell>{item.allocated_hours}</TableCell>
                <TableCell className={cn(utilizationColor(item.utilization_pct))}>
                  {item.utilization_pct}%
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
