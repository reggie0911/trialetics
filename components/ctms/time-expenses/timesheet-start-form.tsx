'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { Study } from '@/lib/types/ctms';
import { ensureTimesheetPeriod } from '@/lib/actions/timesheets';
import { getWeekRangeForDate } from '@/lib/utils/timesheet-week';
import { getStudies } from '@/lib/actions/studies';

export function TimesheetStartForm() {
  const router = useRouter();
  const [studies, setStudies] = useState<Pick<Study, 'id' | 'title'>[]>([]);
  const [studyId, setStudyId] = useState<string>('');
  const [weekAnchor, setWeekAnchor] = useState(() => formatDateInput(new Date()));
  const [pending, startTransition] = useTransition();

  const studyItems = useMemo(
    () => studies.map((s) => ({ value: s.id, label: s.title })),
    [studies],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getStudies();
        if (cancelled) return;
        setStudies(list.map((s) => ({ id: s.id, title: s.title })));
        setStudyId((prev) => prev || list[0]?.id || '');
      } catch {
        toast.error('Could not load studies.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onCreate = () => {
    if (!studyId) {
      toast.error('Select a study.');
      return;
    }
    const anchor = new Date(`${weekAnchor}T12:00:00`);
    const { weekStart, weekEnd } = getWeekRangeForDate(anchor);
    startTransition(async () => {
      const { data, error } = await ensureTimesheetPeriod({
        studyId,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
      });
      if (error) toast.error(error);
      else if (data?.id) {
        toast.success('Timesheet ready.');
        router.push(`/protected/time-expenses/timesheets/${data.id}`);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New weekly timesheet</CardTitle>
        <p className="text-xs text-muted-foreground">Pick a study and any date in the week (Monday–Sunday).</p>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-4 items-end flex-wrap">
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <Label className="text-xs">Study</Label>
          <Select value={studyId} items={studyItems} onValueChange={setStudyId}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="Select Study" />
            </SelectTrigger>
            <SelectContent>
              {studies.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 flex-1 min-w-[160px]">
          <Label className="text-xs">Date in week</Label>
          <Input
            type="date"
            className="text-xs h-9"
            value={weekAnchor}
            onChange={(e) => setWeekAnchor(e.target.value)}
          />
        </div>
        <Button type="button" className="text-xs h-9" disabled={pending} onClick={onCreate}>
          Open or create
        </Button>
      </CardContent>
    </Card>
  );
}

function formatDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
