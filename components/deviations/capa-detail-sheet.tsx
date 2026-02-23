'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { updateCAPA, getCAPAReviews } from '@/lib/actions/deviations';
import type { CAPA, CAPAStatus, CAPAEffectivenessReview } from '@/lib/types/deviations';
import { CAPA_STATUS_LABELS, CAPA_TYPE_LABELS } from '@/lib/types/deviations';
import { CAPAEffectivenessForm } from './capa-effectiveness-form';

interface CAPADetailSheetProps {
  capa: CAPA;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function CAPADetailSheet({ capa, open, onOpenChange, onUpdate }: CAPADetailSheetProps) {
  const [status, setStatus] = useState(capa.status);
  const [reviews, setReviews] = useState<CAPAEffectivenessReview[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadReviews = useCallback(async () => {
    const result = await getCAPAReviews(capa.id);
    if (result.success && result.data) setReviews(result.data);
  }, [capa.id]);

  useEffect(() => {
    if (open) loadReviews();
  }, [open, loadReviews]);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateCAPA(capa.id, { status });
    setIsSaving(false);
    if (result.success) onUpdate();
  };

  const assignedTo = capa.assigned_to
    ? `${capa.assigned_to.first_name || ''} ${capa.assigned_to.last_name || ''}`.trim()
    : 'Unassigned';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{capa.capa_number}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-sm font-medium">{capa.title}</p>
            {capa.description && <p className="text-xs text-muted-foreground mt-1">{capa.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Type</p>
              <Badge variant="outline" className="mt-1 text-[10px]">{CAPA_TYPE_LABELS[capa.type]}</Badge>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Assigned To</p>
              <p className="text-sm">{assignedTo}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Deviation</p>
              <p className="text-sm">{capa.deviation?.deviation_number || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Due Date</p>
              <p className="text-sm">{capa.planned_end_date ? new Date(capa.planned_end_date).toLocaleDateString() : '-'}</p>
            </div>
          </div>

          {capa.action_plan && (
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Action Plan</p>
              <p className="text-xs mt-1 whitespace-pre-wrap">{capa.action_plan}</p>
            </div>
          )}

          <Separator />

          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as CAPAStatus)}>
              <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CAPA_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button size="sm" onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Effectiveness Reviews</p>
              <Button variant="outline" size="sm" onClick={() => setShowReviewForm(true)}>Add Review</Button>
            </div>

            {reviews.length === 0 ? (
              <p className="text-xs text-muted-foreground">No effectiveness reviews yet</p>
            ) : (
              <div className="space-y-2">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded border p-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">{new Date(review.review_date).toLocaleDateString()}</p>
                      <Badge variant={review.is_effective ? 'default' : 'destructive'} className="text-[10px]">
                        {review.is_effective ? 'Effective' : 'Ineffective'}
                      </Badge>
                    </div>
                    {review.findings && <p className="text-xs text-muted-foreground mt-1">{review.findings}</p>}
                    {review.follow_up_required && (
                      <p className="text-xs text-yellow-600 mt-1">Follow-up required</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showReviewForm && (
          <CAPAEffectivenessForm
            capaId={capa.id}
            open={showReviewForm}
            onOpenChange={setShowReviewForm}
            onSuccess={() => {
              setShowReviewForm(false);
              loadReviews();
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
