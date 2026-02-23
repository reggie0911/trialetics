'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getEngagementActivities } from '@/lib/actions/patient-engagement';
import type { EngagementActivity, EngagementFilters } from '@/lib/types/patient-engagement';
import {
  ACTIVITY_TYPE_LABELS,
  CHANNEL_LABELS,
  OUTCOME_LABELS,
} from '@/lib/types/patient-engagement';
import { EngagementActivityDialog } from './engagement-activity-dialog';

interface EngagementActivityLogProps {
  companyId: string;
}

const outcomeColors: Record<string, string> = {
  successful: 'bg-green-100 text-green-800',
  no_answer: 'bg-gray-100 text-gray-800',
  rescheduled: 'bg-blue-100 text-blue-800',
  declined: 'bg-red-100 text-red-800',
  not_applicable: 'bg-gray-50 text-gray-600',
};

export function EngagementActivityLog({ companyId }: EngagementActivityLogProps) {
  const [activities, setActivities] = useState<EngagementActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<EngagementFilters>({});
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await getEngagementActivities(companyId, filters);
    if (res.success && res.data) {
      setActivities(res.data.items);
      setTotal(res.data.total);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [companyId, filters]);

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b">
        <div className="flex gap-2">
          <Select
            value={filters.activityType || 'all'}
            onValueChange={(v) =>
              setFilters({ ...filters, activityType: v as EngagementFilters['activityType'], page: 1 })
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Activity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(ACTIVITY_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.channel || 'all'}
            onValueChange={(v) =>
              setFilters({ ...filters, channel: v as EngagementFilters['channel'], page: 1 })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>Log Activity</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No engagement activities recorded
                </TableCell>
              </TableRow>
            ) : (
              activities.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    {ACTIVITY_TYPE_LABELS[a.activity_type]}
                  </TableCell>
                  <TableCell>{CHANNEL_LABELS[a.channel]}</TableCell>
                  <TableCell>
                    {a.outcome ? (
                      <Badge variant="outline" className={outcomeColors[a.outcome]}>
                        {OUTCOME_LABELS[a.outcome]}
                      </Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {new Date(a.performed_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                    {a.notes || '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {total > (filters.pageSize || 25) && (
        <div className="flex items-center justify-between p-4 border-t">
          <p className="text-xs text-muted-foreground">Showing {activities.length} of {total}</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={(filters.page || 1) <= 1}
              onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={activities.length < (filters.pageSize || 25)}
              onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <EngagementActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          setDialogOpen(false);
          load();
        }}
      />
    </div>
  );
}
