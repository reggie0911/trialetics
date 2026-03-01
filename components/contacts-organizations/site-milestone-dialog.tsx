/**
 * Site Milestone Dialog Component
 * Edit site-specific milestone dates, IRB information, and subject counts
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { useToast } from '@/hooks/use-toast';
import { updateSiteMilestones } from '@/lib/actions/organizations';
import { UpdateSiteMilestonesData } from '@/lib/types/contacts-organizations';

interface SiteMilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationProjectId: string;
  milestones: any; // OrganizationProject with milestone fields
  onSuccess: () => void;
}

export function SiteMilestoneDialog({
  open,
  onOpenChange,
  organizationProjectId,
  milestones,
  onSuccess,
}: SiteMilestoneDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, setValue } = useForm<UpdateSiteMilestonesData>({
    defaultValues: {
      site_initiation_date: milestones?.site_initiation_date || null,
      site_qualification_date: milestones?.site_qualification_date || null,
      close_out_date: milestones?.close_out_date || null,
      first_subject_enrolled_date: milestones?.first_subject_enrolled_date || null,
      last_subject_enrolled_date: milestones?.last_subject_enrolled_date || null,
      last_completed_visit_date: milestones?.last_completed_visit_date || null,
      planned_subject_count: milestones?.planned_subject_count || 0,
      enrolled_subject_count: milestones?.enrolled_subject_count || 0,
      screen_failure_count: milestones?.screen_failure_count || 0,
      completed_subject_count: milestones?.completed_subject_count || 0,
    },
  });

  useEffect(() => {
    if (open && milestones) {
      reset({
        site_initiation_date: milestones.site_initiation_date || null,
        site_qualification_date: milestones.site_qualification_date || null,
        close_out_date: milestones.close_out_date || null,
        first_subject_enrolled_date: milestones.first_subject_enrolled_date || null,
        last_subject_enrolled_date: milestones.last_subject_enrolled_date || null,
        last_completed_visit_date: milestones.last_completed_visit_date || null,
        planned_subject_count: milestones.planned_subject_count || 0,
        enrolled_subject_count: milestones.enrolled_subject_count || 0,
        screen_failure_count: milestones.screen_failure_count || 0,
        completed_subject_count: milestones.completed_subject_count || 0,
      });
    }
  }, [open, milestones, reset]);

  const onSubmit = async (data: UpdateSiteMilestonesData) => {
    setIsSubmitting(true);

    const result = await updateSiteMilestones(organizationProjectId, data);

    if (result.success) {
      onSuccess();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to update site milestones',
        variant: 'destructive',
      });
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xs md:text-xs">Edit Site Milestones</DialogTitle>
          <DialogDescription className="text-xs md:text-xs">
            Update site-specific milestone dates and subject enrollment data.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Site Dates */}
          <div className="space-y-3">
            <h3 className="text-xs md:text-xs font-medium">Site Dates</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="site_initiation_date" className="text-xs">Site Initiation Date</Label>
                <Input
                  id="site_initiation_date"
                  type="date"
                  className="text-xs md:text-xs h-8"
                  {...register('site_initiation_date')}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="site_qualification_date" className="text-xs">Site Qualification Date</Label>
                <Input
                  id="site_qualification_date"
                  type="date"
                  className="text-xs md:text-xs h-8"
                  {...register('site_qualification_date')}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="close_out_date" className="text-xs">Close-Out Date</Label>
                <Input
                  id="close_out_date"
                  type="date"
                  className="text-xs md:text-xs h-8"
                  {...register('close_out_date')}
                />
              </div>
            </div>
          </div>

          {/* Subject Enrollment */}
          <div className="space-y-3">
            <h3 className="text-xs md:text-xs font-medium">Subject Enrollment</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="planned_subject_count" className="text-xs">Planned Subject Count</Label>
                <Input
                  id="planned_subject_count"
                  type="number"
                  min="0"
                  className="text-xs md:text-xs h-8"
                  placeholder="0"
                  {...register('planned_subject_count', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="enrolled_subject_count" className="text-xs">Enrolled Subject Count</Label>
                <Input
                  id="enrolled_subject_count"
                  type="number"
                  min="0"
                  className="text-xs md:text-xs h-8"
                  placeholder="0"
                  {...register('enrolled_subject_count', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="screen_failure_count" className="text-xs">Screen Failure Count</Label>
                <Input
                  id="screen_failure_count"
                  type="number"
                  min="0"
                  className="text-xs md:text-xs h-8"
                  placeholder="0"
                  {...register('screen_failure_count', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="completed_subject_count" className="text-xs">Completed Subject Count</Label>
                <Input
                  id="completed_subject_count"
                  type="number"
                  min="0"
                  className="text-xs md:text-xs h-8"
                  placeholder="0"
                  {...register('completed_subject_count', { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          {/* Visit Dates */}
          <div className="space-y-3">
            <h3 className="text-xs md:text-xs font-medium">Visit Dates</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="first_subject_enrolled_date" className="text-xs">First Subject Enrolled Date</Label>
                <Input
                  id="first_subject_enrolled_date"
                  type="date"
                  className="text-xs md:text-xs h-8"
                  {...register('first_subject_enrolled_date')}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="last_subject_enrolled_date" className="text-xs">Last Subject Enrolled Date</Label>
                <Input
                  id="last_subject_enrolled_date"
                  type="date"
                  className="text-xs md:text-xs h-8"
                  {...register('last_subject_enrolled_date')}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="last_completed_visit_date" className="text-xs">Last Completed Visit Date</Label>
                <Input
                  id="last_completed_visit_date"
                  type="date"
                  className="text-xs md:text-xs h-8"
                  {...register('last_completed_visit_date')}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs md:text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="text-xs md:text-xs">
              {isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
