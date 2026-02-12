'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createSiteVisit, updateSiteVisit, getProfilesForCompany } from '@/lib/actions/site-visits';
import {
  SITE_VISIT_TYPE_LABELS,
  SITE_VISIT_STATUS_LABELS,
  type SiteVisitType,
  type SiteVisitStatus,
  type SiteVisit,
} from '@/lib/types/contacts-organizations';

const siteVisitSchema = z.object({
  visit_name: z.string().min(1, 'Visit name is required'),
  visit_type: z.enum(['evaluation', 'initiation', 'monitoring', 'close_out', 'unscheduled']),
  visit_start: z.string().min(1, 'Visit date/time is required'),
  visit_status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']),
  project_id: z.string().optional(),
  assigned_to_id: z.string().optional(),
  notes: z.string().optional(),
});

type SiteVisitFormValues = z.infer<typeof siteVisitSchema>;

interface SiteVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  organizationId: string;
  companyId: string;
  visit?: SiteVisit | null;
  projects?: Array<{ id: string; protocol_number: string; protocol_name: string }>;
}

export function SiteVisitDialog({
  open,
  onOpenChange,
  onSuccess,
  organizationId,
  companyId,
  visit,
  projects = [],
}: SiteVisitDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profiles, setProfiles] = useState<Array<{ id: string; first_name: string | null; email: string | null }>>([]);
  const isEditing = !!visit;

  const { register, handleSubmit, reset, setValue, watch } = useForm<SiteVisitFormValues>({
    resolver: zodResolver(siteVisitSchema),
    defaultValues: {
      visit_name: '',
      visit_type: 'monitoring',
      visit_start: '',
      visit_status: 'planned',
      project_id: '',
      assigned_to_id: '',
      notes: '',
    },
  });

  const selectedType = watch('visit_type');
  const selectedStatus = watch('visit_status');

  useEffect(() => {
    if (open) {
      getProfilesForCompany(companyId).then((r) => {
        if (r.success && r.data) setProfiles(r.data);
      });
    }
  }, [open, companyId]);

  useEffect(() => {
    if (open) {
      if (visit) {
        const visitStart = visit.visit_start.slice(0, 16);
        reset({
          visit_name: visit.visit_name,
          visit_type: visit.visit_type,
          visit_start: visitStart,
          visit_status: visit.visit_status,
          project_id: visit.project_id || '',
          assigned_to_id: visit.assigned_to_id || '',
          notes: visit.notes || '',
        });
      } else {
        reset({
          visit_name: '',
          visit_type: 'monitoring',
          visit_start: '',
          visit_status: 'planned',
          project_id: '',
          assigned_to_id: '',
          notes: '',
        });
      }
    }
  }, [open, visit, reset]);

  const onSubmit = async (values: SiteVisitFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        visit_name: values.visit_name,
        visit_type: values.visit_type as SiteVisitType,
        visit_start: values.visit_start,
        visit_status: values.visit_status as SiteVisitStatus,
        project_id: values.project_id || null,
        assigned_to_id: values.assigned_to_id || null,
        notes: values.notes || null,
      };

      const result = isEditing
        ? await updateSiteVisit(visit.id, payload)
        : await createSiteVisit(organizationId, payload);

      if (result.success) {
        toast({
          title: isEditing ? 'Site visit updated' : 'Site visit created',
          description: `${values.visit_name} has been ${isEditing ? 'updated' : 'created'} successfully.`,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || `Failed to ${isEditing ? 'update' : 'create'} site visit`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {isEditing ? 'Edit Site Visit' : 'New Site Visit'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing
              ? 'Update the site visit details.'
              : 'Schedule a site visit (evaluation, initiation, monitoring, close-out, or unscheduled).'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="visit_name" className="text-xs">Visit Name *</Label>
            <Input
              id="visit_name"
              placeholder="e.g. Site Initiation Visit - Q1 2025"
              className="text-xs h-8"
              {...register('visit_name')}
            />
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="visit_type" className="text-xs">Visit Type *</Label>
              <Select
                value={selectedType}
                onValueChange={(v) => v && setValue('visit_type', v as SiteVisitType)}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SITE_VISIT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="visit_status" className="text-xs">Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(v) => v && setValue('visit_status', v as SiteVisitStatus)}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SITE_VISIT_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="visit_start" className="text-xs">Visit Date & Time *</Label>
            <Input
              id="visit_start"
              type="datetime-local"
              className="text-xs h-8"
              {...register('visit_start')}
            />
          </div>

          {projects.length > 0 && (
            <div className="space-y-1">
              <Label htmlFor="project_id" className="text-xs">Project (optional)</Label>
              <Select
                value={watch('project_id') || ''}
                onValueChange={(v) => setValue('project_id', v || '')}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">None</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.protocol_number} - {p.protocol_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {profiles.length > 0 && (
            <div className="space-y-1">
              <Label htmlFor="assigned_to_id" className="text-xs">Assigned To</Label>
              <Select
                value={watch('assigned_to_id') || ''}
                onValueChange={(v) => setValue('assigned_to_id', v || '')}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">Unassigned</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.first_name || p.email || p.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              className="text-xs resize-none"
              rows={2}
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="text-xs">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Update' : 'Create Visit'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
