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

interface SiteIrbDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicalSiteId: string;
  milestones: any;
  onSuccess: () => void;
}

export function SiteIrbDialog({
  open,
  onOpenChange,
  clinicalSiteId,
  milestones,
  onSuccess,
}: SiteIrbDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset } = useForm<UpdateSiteMilestonesData>({
    defaultValues: {
      irb_institution_name: milestones?.irb_institution_name || null,
      central_irb_name: milestones?.central_irb_name || null,
      irb_approval_number: milestones?.irb_approval_number || null,
      irb_approval_date: milestones?.irb_approval_date || null,
      irb_expiration_date: milestones?.irb_expiration_date || null,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        irb_institution_name: milestones?.irb_institution_name || null,
        central_irb_name: milestones?.central_irb_name || null,
        irb_approval_number: milestones?.irb_approval_number || null,
        irb_approval_date: milestones?.irb_approval_date || null,
        irb_expiration_date: milestones?.irb_expiration_date || null,
      });
    }
  }, [open, milestones, reset]);

  const onSubmit = async (data: UpdateSiteMilestonesData) => {
    setIsSubmitting(true);

    const result = await updateSiteMilestones(clinicalSiteId, data);

    if (result.success) {
      onSuccess();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to update IRB information',
        variant: 'destructive',
      });
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xs md:text-xs">Edit IRB Information</DialogTitle>
          <DialogDescription className="text-xs md:text-xs">
            Update IRB/EC institution names, approval number, and key dates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="irb_institution_name" className="text-xs">Local IRB Name</Label>
              <Input
                id="irb_institution_name"
                className="text-xs md:text-xs h-8"
                placeholder="Enter local IRB institution name"
                {...register('irb_institution_name')}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="central_irb_name" className="text-xs">Central IRB Name</Label>
              <Input
                id="central_irb_name"
                className="text-xs md:text-xs h-8"
                placeholder="Enter central IRB name"
                {...register('central_irb_name')}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="irb_approval_number" className="text-xs">IRB Approval Number</Label>
                <Input
                  id="irb_approval_number"
                  className="text-xs md:text-xs h-8"
                  placeholder="Enter approval number"
                  {...register('irb_approval_number')}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="irb_approval_date" className="text-xs">IRB Approval Date</Label>
                <Input
                  id="irb_approval_date"
                  type="date"
                  className="text-xs md:text-xs h-8"
                  {...register('irb_approval_date')}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="irb_expiration_date" className="text-xs">IRB Expiration Date</Label>
                <Input
                  id="irb_expiration_date"
                  type="date"
                  className="text-xs md:text-xs h-8"
                  {...register('irb_expiration_date')}
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
