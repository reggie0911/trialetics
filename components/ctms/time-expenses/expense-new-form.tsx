'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Study } from '@/lib/types/ctms';
import { createExpenseReportDraft } from '@/lib/actions/expense-reports';
import { getStudies } from '@/lib/actions/studies';

export function ExpenseNewForm() {
  const router = useRouter();
  const [studies, setStudies] = useState<Pick<Study, 'id' | 'title'>[]>([]);
  const [studyId, setStudyId] = useState('');
  const [title, setTitle] = useState('Expense report');
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
    startTransition(async () => {
      const { data, error } = await createExpenseReportDraft({ studyId, title: title.trim() || undefined });
      if (error) toast.error(error);
      else if (data?.id) router.push(`/protected/time-expenses/expenses/${data.id}`);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New expense report</CardTitle>
        <p className="text-xs text-muted-foreground">One study per report. Add lines and receipts on the next screen.</p>
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
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <Label className="text-xs">Report title</Label>
          <Input className="text-xs h-9" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <Button type="button" className="text-xs h-9" disabled={pending} onClick={onCreate}>
          Create
        </Button>
      </CardContent>
    </Card>
  );
}
