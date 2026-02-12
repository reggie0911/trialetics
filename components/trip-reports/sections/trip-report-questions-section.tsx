'use client';

import { useState } from 'react';
import { TripReportSectionCard } from './trip-report-section-card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { updateChecklistItem } from '@/lib/actions/trip-reports';
import { useToast } from '@/hooks/use-toast';
import { CHECKLIST_RESPONSE_LABELS, type ChecklistResponse } from '@/lib/types/trip-reports';
import type { TripReportChecklistItem } from '@/lib/types/trip-reports';

interface TripReportQuestionsSectionProps {
  tripReportId: string;
  items: TripReportChecklistItem[];
  isLocked: boolean;
  onRefresh: () => void;
}

function groupBySubSection(items: TripReportChecklistItem[]) {
  const groups: { subsection: string | null; items: TripReportChecklistItem[] }[] = [];
  let current: { subsection: string | null; items: TripReportChecklistItem[] } | null = null;
  for (const item of items) {
    const sub = item.report_sub_section ?? null;
    if (!current || current.subsection !== sub) {
      current = { subsection: sub, items: [] };
      groups.push(current);
    }
    current.items.push(item);
  }
  return groups;
}

export function TripReportQuestionsSection({
  tripReportId,
  items,
  isLocked,
  onRefresh,
}: TripReportQuestionsSectionProps) {
  const { toast } = useToast();
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, { response?: ChecklistResponse | null; comments?: string; reviewer_comments?: string }>>({});

  const handleResponseChange = async (itemId: string, response: ChecklistResponse | null) => {
    if (isLocked) return;
    const item = items.find((i) => i.id === itemId);
    const result = await updateChecklistItem(itemId, {
      response: response ?? undefined,
      comments: item?.comments ?? undefined,
      reviewer_comments: item?.reviewer_comments ?? undefined,
    });
    if (result.success) onRefresh();
    else toast({ title: 'Error', description: result.error, variant: 'destructive' });
  };

  const handleCommentsBlur = async (itemId: string, comments: string) => {
    if (isLocked) return;
    const item = items.find((i) => i.id === itemId);
    if (comments === (item?.comments ?? '')) return;
    const result = await updateChecklistItem(itemId, {
      comments: comments || null,
      response: (item?.response as ChecklistResponse) ?? undefined,
      reviewer_comments: item?.reviewer_comments ?? undefined,
    });
    if (result.success) onRefresh();
    else toast({ title: 'Error', description: result.error, variant: 'destructive' });
  };

  const handleReviewerCommentsBlur = async (itemId: string, reviewer_comments: string) => {
    if (isLocked) return;
    const item = items.find((i) => i.id === itemId);
    if (reviewer_comments === (item?.reviewer_comments ?? '')) return;
    const result = await updateChecklistItem(itemId, {
      reviewer_comments: reviewer_comments || null,
      comments: item?.comments ?? undefined,
      response: (item?.response as ChecklistResponse) ?? undefined,
    });
    if (result.success) onRefresh();
    else toast({ title: 'Error', description: result.error, variant: 'destructive' });
  };

  const groups = groupBySubSection(items);

  if (items.length === 0) {
    return (
      <TripReportSectionCard title="Questions">
        <p className="text-sm text-muted-foreground py-4">No questions from template</p>
      </TripReportSectionCard>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group, gIdx) => (
        <TripReportSectionCard
          key={gIdx}
          title={group.subsection ?? 'Questions'}
          count={group.items.length}
        >
          <div className="space-y-6">
            {group.items.map((item, idx) => (
              <div key={item.id} className="space-y-3 border-b pb-4 last:border-0 last:pb-0">
                <div className="flex gap-4 flex-col sm:flex-row">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      {String.fromCharCode(97 + idx)}. {item.activity}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Label className="text-xs text-muted-foreground block mb-2">Responses</Label>
                    <RadioGroup
                      value={item.response ?? ''}
                      onValueChange={(v) => handleResponseChange(item.id, v as ChecklistResponse)}
                      disabled={isLocked}
                      className="flex flex-row gap-4"
                    >
                      {(['yes', 'no', 'nd', 'na'] as const).map((r) => (
                        <div key={r} className="flex items-center space-x-2">
                          <RadioGroupItem value={r} id={`${item.id}-${r}`} />
                          <Label htmlFor={`${item.id}-${r}`} className="text-sm font-normal cursor-pointer">
                            {CHECKLIST_RESPONSE_LABELS[r]}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Comments:</Label>
                    <Textarea
                      defaultValue={item.comments ?? ''}
                      onBlur={(e) => handleCommentsBlur(item.id, e.target.value)}
                      disabled={isLocked}
                      placeholder="Comments..."
                      className="min-h-[60px] text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Reviewer Comments:</Label>
                    <Textarea
                      defaultValue={item.reviewer_comments ?? ''}
                      onBlur={(e) => handleReviewerCommentsBlur(item.id, e.target.value)}
                      disabled={isLocked}
                      placeholder="Reviewer comments..."
                      className="min-h-[60px] text-sm resize-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TripReportSectionCard>
      ))}
    </div>
  );
}
