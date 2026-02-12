'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createTripReport } from '@/lib/actions/trip-reports';
import { getSiteVisit } from '@/lib/actions/site-visits';
import type { TripReportTemplateWithDetails } from '@/lib/types/trip-reports';
import { SITE_VISIT_TYPE_LABELS } from '@/lib/types/contacts-organizations';

interface TripReportCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteVisitId: string | null;
  templates: TripReportTemplateWithDetails[];
  onSuccess: () => void;
}

export function TripReportCreateDialog({
  open,
  onOpenChange,
  siteVisitId,
  templates,
  onSuccess,
}: TripReportCreateDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [siteVisit, setSiteVisit] = useState<{ id: string; visit_name: string; visit_type: string } | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && siteVisitId) {
      getSiteVisit(siteVisitId).then((r) => {
        if (r.success && r.data) {
          setSiteVisit({
            id: r.data.id,
            visit_name: r.data.visit_name,
            visit_type: r.data.visit_type,
          });
        }
      });
    }
  }, [open, siteVisitId]);

  const handleCreate = async () => {
    if (!siteVisitId) return;
    setIsSubmitting(true);
    const result = await createTripReport(siteVisitId, {
      template_id: selectedTemplateId || null,
    });
    if (result.success && result.data) {
      toast({ title: 'Trip report created', description: 'Redirecting to trip report...' });
      onOpenChange(false);
      onSuccess();
      router.push(`/protected/trip-reports/${result.data.id}`);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const applicableTemplates = templates.filter(
    (t) => !siteVisit || t.visit_type === siteVisit.visit_type
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xs">Create Trip Report</DialogTitle>
          <DialogDescription className="text-xs">
            {siteVisit
              ? `Create a trip report for "${siteVisit.visit_name}" (${SITE_VISIT_TYPE_LABELS[siteVisit.visit_type as keyof typeof SITE_VISIT_TYPE_LABELS]}). Optionally apply a template.`
              : 'Loading...'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <Label className="text-xs">Template (optional)</Label>
            <Select value={selectedTemplateId} onValueChange={(v) => setSelectedTemplateId(v ?? '')}>
              <SelectTrigger className="text-[12px] h-8">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="text-[12px]">None</SelectItem>
                {applicableTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-[12px]">
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isSubmitting} className="text-xs">
            {isSubmitting ? 'Creating...' : 'Create Trip Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
