'use client';

import { useState } from 'react';
import { TripReportSectionCard } from './trip-report-section-card';
import { Textarea } from '@/components/ui/textarea';
import { updateTripReport } from '@/lib/actions/trip-reports';
import { useToast } from '@/hooks/use-toast';

interface TripReportNarrativeSectionProps {
  tripReportId: string;
  narrative: string | null;
  isLocked: boolean;
  onRefresh: () => void;
}

export function TripReportNarrativeSection({
  tripReportId,
  narrative,
  isLocked,
  onRefresh,
}: TripReportNarrativeSectionProps) {
  const { toast } = useToast();
  const [value, setValue] = useState(narrative ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBlur = async () => {
    if (isLocked || value === (narrative ?? '')) return;
    setIsSubmitting(true);
    const result = await updateTripReport(tripReportId, { narrative: value || null });
    if (result.success) onRefresh();
    else toast({ title: 'Error', description: result.error, variant: 'destructive' });
    setIsSubmitting(false);
  };

  return (
    <TripReportSectionCard title="Narrative">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        disabled={isLocked || isSubmitting}
        placeholder="Enter narrative..."
        className="min-h-[120px] text-sm resize-none"
      />
    </TripReportSectionCard>
  );
}
