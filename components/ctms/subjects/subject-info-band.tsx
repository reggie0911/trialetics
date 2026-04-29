'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { SubjectStatus } from '@/lib/types/ctms';

function Cell({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-0.5">
      <p
        data-slot="stat-card-title"
        className="!text-[12px] font-medium text-muted-foreground"
      >
        {label}
      </p>
      <p className="text-[11px] font-medium text-foreground break-words">{value || '—'}</p>
    </div>
  );
}

type SubjectInfoBandProps = {
  subjectNumber: string;
  screeningNumber: string | null;
  randomizationNumber: string | null;
  status: SubjectStatus;
  siteLine: string | null;
};

export function SubjectInfoBand({
  subjectNumber,
  screeningNumber,
  randomizationNumber,
  status,
  siteLine,
}: SubjectInfoBandProps) {
  return (
    <Card className="overflow-hidden rounded-[5px] border border-border/70 py-0 shadow-sm">
      <CardHeader className="border-b border-border/80 px-4 py-3.5">
        <CardTitle
          data-slot="stat-card-title"
          className="!text-[12px] font-medium text-muted-foreground"
        >
          Subject Information
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-3.5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Cell
            label="Subject Number"
            value={subjectNumber}
          />
          <Cell
            label="Screening Number"
            value={screeningNumber}
          />
          <Cell
            label="Randomization Number"
            value={randomizationNumber}
          />
          <div className="space-y-0.5">
            <p
              data-slot="stat-card-title"
              className="!text-[12px] font-medium text-muted-foreground"
            >
              Status
            </p>
            <StatusBadge
              status={status}
              className="text-[11px]"
            />
          </div>
          <Cell
            label="Site"
            value={siteLine}
          />
        </div>
      </CardContent>
    </Card>
  );
}

