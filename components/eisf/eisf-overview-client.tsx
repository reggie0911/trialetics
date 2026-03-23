'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { getEisfDashboardStats } from '@/lib/actions/eisf';
import type { EisfDashboardStats } from '@/lib/types/eisf';
import type { EtmfStudyOption } from '@/lib/types/etmf';
import { EisfDashboardCharts } from '@/components/eisf/eisf-dashboard-charts';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function EisfOverviewClient({
  greeting,
  studies,
  initialStudyId,
  initialStats,
}: {
  greeting: string;
  studies: EtmfStudyOption[];
  initialStudyId: string | null;
  initialStats: EisfDashboardStats | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studyFromUrl = searchParams.get('study');
  const [studyId, setStudyId] = useState<string | null>(studyFromUrl || initialStudyId);
  const [stats, setStats] = useState<EisfDashboardStats | null>(initialStats);
  const [pending, startTransition] = useTransition();
  const skipNextFetch = useRef(true);

  const loadStats = useCallback((sid: string | null) => {
    startTransition(async () => {
      const res = await getEisfDashboardStats(sid);
      if (res.success && res.data) setStats(res.data);
      else setStats(null);
    });
  }, []);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    loadStats(studyId);
  }, [studyId, loadStats]);

  const studyLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of studies) {
      m.set(s.id, `${s.protocol_number} — ${s.title}`);
    }
    return m;
  }, [studies]);

  const studyScopeDisplayLabel = useCallback(
    (value: string | null) => {
      if (value == null || value === '__all__') return 'All Studies';
      return studyLabelById.get(value) ?? 'Study';
    },
    [studyLabelById]
  );

  const onStudyChange = (v: string) => {
    const next = v === '__all__' ? null : v;
    setStudyId(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set('study', next);
    else params.delete('study');
    router.replace(`/protected/eisf?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor site document completeness, requests, and expirations.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5 min-w-[220px]">
          <Label htmlFor="eisf-study" className="text-xs text-muted-foreground">
            Study Scope
          </Label>
          <Select
            value={studyId ?? '__all__'}
            onValueChange={onStudyChange}
            disabled={pending}
          >
            <SelectTrigger id="eisf-study" className="text-[12px] h-9 w-[260px] min-w-[260px]">
              <SelectValue placeholder="All Studies" getDisplayLabel={studyScopeDisplayLabel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-[12px]">
                All Studies
              </SelectItem>
              {studies.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-[12px]">
                  {s.protocol_number} — {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {pending && <span className="text-xs text-muted-foreground">Updating…</span>}
      </div>

      <EisfDashboardCharts stats={stats} />
    </div>
  );
}
