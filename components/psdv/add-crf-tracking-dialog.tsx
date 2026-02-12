'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  getSiteVisitsForCrf,
  getSubjectVisitsAvailableForSiteVisit,
  addCrfTrackingScheduled,
  addCrfTrackingUnscheduled,
} from '@/lib/actions/psdv';

type SiteVisitOption = { id: string; visit_name: string; visit_start: string; visit_type: string };
type SubjectVisitOption = {
  id: string;
  visit_name: string;
  subject_id: string;
  visit_type: string;
  subject?: { subject_number: string; screening_number: string };
  template_visit?: { visit_name: string };
};

interface AddCrfTrackingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  mode: 'scheduled' | 'unscheduled';
  onSuccess: () => void;
}

export function AddCrfTrackingDialog({
  open,
  onOpenChange,
  companyId,
  mode,
  onSuccess,
}: AddCrfTrackingDialogProps) {
  const { toast } = useToast();
  const [siteVisits, setSiteVisits] = useState<SiteVisitOption[]>([]);
  const [selectedSiteVisitId, setSelectedSiteVisitId] = useState<string>('');
  const [subjectVisits, setSubjectVisits] = useState<SubjectVisitOption[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setIsLoadingSites(true);
      getSiteVisitsForCrf(companyId).then((r) => {
        if (r.success && r.data) setSiteVisits(r.data);
        setIsLoadingSites(false);
      });
    }
  }, [open, companyId]);

  useEffect(() => {
    if (open && selectedSiteVisitId) {
      setIsLoadingSubjects(true);
      setSubjectVisits([]);
      setSelectedSubjectIds(new Set());
      getSubjectVisitsAvailableForSiteVisit(companyId, selectedSiteVisitId).then((r) => {
        if (r.success && r.data) setSubjectVisits(r.data);
        setIsLoadingSubjects(false);
      });
    } else {
      setSubjectVisits([]);
      setSelectedSubjectIds(new Set());
    }
  }, [open, companyId, selectedSiteVisitId]);

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedSubjectIds.size === subjectVisits.length) {
      setSelectedSubjectIds(new Set());
    } else {
      setSelectedSubjectIds(new Set(subjectVisits.map((v) => v.id)));
    }
  };

  const handleSubmit = async () => {
    if (!selectedSiteVisitId || selectedSubjectIds.size === 0) {
      toast({ title: 'Select a site visit and at least one subject visit', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const addFn = mode === 'scheduled' ? addCrfTrackingScheduled : addCrfTrackingUnscheduled;
      const result = await addFn(selectedSiteVisitId, Array.from(selectedSubjectIds), companyId);
      if (result.success) {
        toast({ title: 'Success', description: `Added ${result.data?.count ?? 0} CRF record(s)` });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const modeLabel = mode === 'scheduled' ? 'Add Scheduled' : 'Add Unscheduled';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{modeLabel} Subject Visits</DialogTitle>
          <DialogDescription>
            Link subject visits to a site visit for CRF tracking during monitoring.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium mb-2 block">Site Visit</label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-[12px]"
              value={selectedSiteVisitId}
              onChange={(e) => setSelectedSiteVisitId(e.target.value)}
              disabled={isLoadingSites}
            >
              <option value="">Select site visit...</option>
              {siteVisits.map((sv) => (
                <option key={sv.id} value={sv.id}>
                  {sv.visit_name} — {new Date(sv.visit_start).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          {selectedSiteVisitId && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium">Subject Visits</label>
                {subjectVisits.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">
                    {selectedSubjectIds.size === subjectVisits.length ? 'Clear all' : 'Select all'}
                  </Button>
                )}
              </div>
              {isLoadingSubjects ? (
                <div className="text-xs text-muted-foreground py-4">Loading...</div>
              ) : subjectVisits.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4">
                  No subject visits available. All visits may already be tracked for this site visit.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-md border p-2 space-y-2">
                  {subjectVisits.map((sv) => (
                    <label
                      key={sv.id}
                      className="flex items-center gap-2 cursor-pointer text-xs hover:bg-muted/50 rounded p-1"
                    >
                      <Checkbox
                        checked={selectedSubjectIds.has(sv.id)}
                        onCheckedChange={() => toggleSubject(sv.id)}
                      />
                      <span>
                        {sv.visit_name}
                        {sv.subject && ` (${sv.subject.subject_number || sv.subject.screening_number || '—'})`}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedSiteVisitId || selectedSubjectIds.size === 0}
              className="text-xs"
            >
              {isSubmitting ? 'Adding...' : modeLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
