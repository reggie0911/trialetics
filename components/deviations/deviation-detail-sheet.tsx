'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { updateDeviation } from '@/lib/actions/deviations';
import type { Deviation, DeviationStatus } from '@/lib/types/deviations';
import { DEVIATION_STATUS_LABELS, DEVIATION_SEVERITY_LABELS } from '@/lib/types/deviations';

interface DeviationDetailSheetProps {
  deviation: Deviation;
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function DeviationDetailSheet({ deviation, companyId, open, onOpenChange, onUpdate }: DeviationDetailSheetProps) {
  const [status, setStatus] = useState(deviation.status);
  const [rootCause, setRootCause] = useState(deviation.root_cause || '');
  const [impactAssessment, setImpactAssessment] = useState(deviation.impact_assessment || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateDeviation(deviation.id, {
      status,
      root_cause: rootCause || undefined,
      impact_assessment: impactAssessment || undefined,
    });
    setIsSaving(false);
    if (result.success) onUpdate();
  };

  const detectedBy = deviation.detected_by
    ? `${deviation.detected_by.first_name || ''} ${deviation.detected_by.last_name || ''}`.trim()
    : 'Unknown';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{deviation.deviation_number}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-sm font-medium">{deviation.title}</p>
            {deviation.description && (
              <p className="text-xs text-muted-foreground mt-1">{deviation.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Severity</p>
              <Badge variant={deviation.severity === 'critical' ? 'destructive' : 'secondary'} className="mt-1 text-[10px]">
                {DEVIATION_SEVERITY_LABELS[deviation.severity]}
              </Badge>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Detected By</p>
              <p className="text-sm">{detectedBy}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Detected Date</p>
              <p className="text-sm">{deviation.detected_date ? new Date(deviation.detected_date).toLocaleDateString() : '-'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Protocol</p>
              <p className="text-sm">{deviation.protocol?.title || deviation.protocol?.protocol_number || '-'}</p>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as DeviationStatus)}>
              <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(DEVIATION_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Root Cause</Label>
            <Textarea className="mt-1 text-xs" rows={3} value={rootCause} onChange={(e) => setRootCause(e.target.value)} placeholder="Describe the root cause..." />
          </div>

          <div>
            <Label className="text-xs">Impact Assessment</Label>
            <Textarea className="mt-1 text-xs" rows={3} value={impactAssessment} onChange={(e) => setImpactAssessment(e.target.value)} placeholder="Assess the impact..." />
          </div>

          <Button size="sm" onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
