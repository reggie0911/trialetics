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
import { createOrganization, updateOrganization } from '@/lib/actions/organizations';
import { EntityStatus, ENTITY_STATUS_LABELS } from '@/lib/types/contacts-organizations';

interface CreateSatelliteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentOrganizationId: string;
  parentOrganizationName: string;
  companyId: string;
  profileId: string;
  userEmail: string;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  site_id: string;
  status: EntityStatus;
}

export function CreateSatelliteDialog({
  open,
  onOpenChange,
  parentOrganizationId,
  parentOrganizationName,
  companyId,
  profileId,
  userEmail,
  onSuccess,
}: CreateSatelliteDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>({
    defaultValues: {
      name: '',
      site_id: '',
      status: 'active',
    },
  });

  const selectedStatus = watch('status');

  useEffect(() => {
    if (open) {
      reset({ name: '', site_id: '', status: 'active' });
    }
  }, [open, reset]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    const createResult = await createOrganization(companyId, profileId, userEmail, {
      name: data.name,
      organization_type: 'site',
      status: data.status,
      site_id: data.site_id || null,
    });

    if (!createResult.success || !createResult.data) {
      toast({
        title: 'Error',
        description: createResult.error || 'Failed to create site',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    const linkResult = await updateOrganization({
      id: createResult.data.id,
      parent_organization_id: parentOrganizationId,
    });

    if (linkResult.success) {
      toast({
        title: 'Satellite site created',
        description: `${data.name} has been created and linked to ${parentOrganizationName}.`,
      });
      onSuccess();
      onOpenChange(false);
    } else {
      toast({
        title: 'Site created but not linked',
        description: linkResult.error || 'The site was created but could not be linked as a satellite.',
        variant: 'destructive',
      });
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xs md:text-xs">Create Satellite Site</DialogTitle>
          <DialogDescription className="text-xs md:text-xs">
            Create a new site and automatically link it as a satellite of{' '}
            <span className="font-medium">{parentOrganizationName}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs">Site Name *</Label>
            <Input
              id="name"
              className="text-xs md:text-xs h-8"
              placeholder="Enter site name"
              {...register('name', { required: true })}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="site_id" className="text-xs">Site ID (Optional)</Label>
            <Input
              id="site_id"
              className="text-xs md:text-xs h-8"
              placeholder="e.g. SITE-001"
              {...register('site_id')}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="status" className="text-xs">Status</Label>
            <select
              id="status"
              className="border-input bg-transparent text-xs h-8 w-full rounded-md border px-2.5 shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
              value={selectedStatus}
              onChange={(e) => setValue('status', e.target.value as EntityStatus)}
            >
              {Object.entries(ENTITY_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
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
              Create & Link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
