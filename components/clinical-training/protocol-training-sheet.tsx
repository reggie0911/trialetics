'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ChartContainer } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { GraduationCap, ExternalLink } from 'lucide-react';
import { getProtocolTrainingSummaryById } from '@/lib/actions/training-stats';

interface ProtocolTrainingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocolId: string;
  protocolNumber: string;
  protocolTitle: string;
}

export function ProtocolTrainingSheet({
  open,
  onOpenChange,
  protocolId,
  protocolNumber,
}: ProtocolTrainingSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Training - {protocolNumber}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <ProtocolTrainingSummary protocolId={protocolId} open={open} />
          <Link
            href="/protected/clinical-training"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Manage Clinical Training
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ProtocolTrainingSummary({ protocolId, open }: { protocolId: string; open: boolean }) {
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!protocolId || !open) return;
    setIsLoading(true);
    getProtocolTrainingSummaryById(protocolId).then((r) => {
      if (r.success && r.data) setSummary(r.data);
      setIsLoading(false);
    });
  }, [protocolId, open]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (!summary) return <p className="text-sm text-muted-foreground">No training data</p>;

  const chartData = [
    { name: 'Trainings', completed: summary.trainings_completed ?? 0, total: summary.total_trainings ?? 0 },
    { name: 'Sites', completed: 0, total: summary.total_sites ?? 0 },
  ].filter((d) => d.total > 0);

  const chartConfig = {
    completed: { label: 'Completed', color: 'var(--chart-1)' },
    total: { label: 'Total', color: 'var(--chart-2)' },
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded border p-3">
          <p className="text-[12px] text-muted-foreground">Total Trainings</p>
          <p className="text-xl font-semibold">{summary.total_trainings ?? 0}</p>
        </div>
        <div className="rounded border p-3">
          <p className="text-[12px] text-muted-foreground">Trainings Completed</p>
          <p className="text-xl font-semibold">{summary.trainings_completed ?? 0}</p>
        </div>
        <div className="rounded border p-3">
          <p className="text-[12px] text-muted-foreground">Total Sites</p>
          <p className="text-xl font-semibold">{summary.total_sites ?? 0}</p>
        </div>
      </div>
      {chartData.length > 0 && (
        <ChartContainer config={chartConfig} className="h-[160px] w-full">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Bar dataKey="completed" radius={[4, 4, 0, 0]} fill="var(--chart-1)" />
            <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="var(--chart-2)" />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}
