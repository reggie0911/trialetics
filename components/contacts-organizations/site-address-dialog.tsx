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
import { addOrganizationAddress, updateOrganizationAddress } from '@/lib/actions/organizations';
import { Address, AddressType } from '@/lib/types/contacts-organizations';

interface SiteAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  address?: Address;
  onSuccess: () => void;
}

interface AddressFormData {
  address_type: AddressType;
  street_1: string;
  street_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  notes: string;
}

const ADDRESS_TYPE_LABELS: Record<string, string> = {
  mailing: 'Mailing',
  shipping: 'Shipping',
  billing: 'Billing',
  other: 'Other',
};

export function SiteAddressDialog({
  open,
  onOpenChange,
  organizationId,
  address,
  onSuccess,
}: SiteAddressDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!address;

  const { register, handleSubmit, reset } = useForm<AddressFormData>({
    defaultValues: {
      address_type: address?.address_type ?? 'shipping',
      street_1: address?.street_1 ?? '',
      street_2: address?.street_2 ?? '',
      city: address?.city ?? '',
      state: address?.state ?? '',
      postal_code: address?.postal_code ?? '',
      country: address?.country ?? '',
      notes: address?.notes ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        address_type: address?.address_type ?? 'shipping',
        street_1: address?.street_1 ?? '',
        street_2: address?.street_2 ?? '',
        city: address?.city ?? '',
        state: address?.state ?? '',
        postal_code: address?.postal_code ?? '',
        country: address?.country ?? '',
        notes: address?.notes ?? '',
      });
    }
  }, [open, address, reset]);

  const onSubmit = async (data: AddressFormData) => {
    setIsSubmitting(true);

    const payload = {
      address_type: data.address_type,
      street_1: data.street_1 || null,
      street_2: data.street_2 || null,
      city: data.city || null,
      state: data.state || null,
      postal_code: data.postal_code || null,
      country: data.country || null,
      is_primary: false,
      notes: data.notes || null,
    };

    const result = isEditing
      ? await updateOrganizationAddress(address!.id, payload)
      : await addOrganizationAddress(organizationId, payload);

    if (result.success) {
      onSuccess();
      onOpenChange(false);
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to save address',
        variant: 'destructive',
      });
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xs md:text-xs">
            {isEditing ? 'Edit Address' : 'Add Address'}
          </DialogTitle>
          <DialogDescription className="text-xs md:text-xs">
            {isEditing ? 'Update this site address.' : 'Add an additional address for this site.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="address_type" className="text-xs">Address Type</Label>
            <select
              id="address_type"
              className="border-input bg-transparent text-xs h-8 w-full rounded-md border px-2.5 shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
              {...register('address_type')}
            >
              {Object.entries(ADDRESS_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="street_1" className="text-xs">Street Address</Label>
            <Input
              id="street_1"
              className="text-xs md:text-xs h-8"
              placeholder="123 Main St"
              {...register('street_1')}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="street_2" className="text-xs">Suite / Unit (Optional)</Label>
            <Input
              id="street_2"
              className="text-xs md:text-xs h-8"
              placeholder="Suite 100"
              {...register('street_2')}
            />
          </div>

          <div className="grid gap-3 grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="city" className="text-xs">City</Label>
              <Input
                id="city"
                className="text-xs md:text-xs h-8"
                placeholder="City"
                {...register('city')}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="state" className="text-xs">State / Province</Label>
              <Input
                id="state"
                className="text-xs md:text-xs h-8"
                placeholder="State"
                {...register('state')}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="postal_code" className="text-xs">Postal Code</Label>
              <Input
                id="postal_code"
                className="text-xs md:text-xs h-8"
                placeholder="00000"
                {...register('postal_code')}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="country" className="text-xs">Country</Label>
              <Input
                id="country"
                className="text-xs md:text-xs h-8"
                placeholder="Country"
                {...register('country')}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">Notes (Optional)</Label>
            <textarea
              id="notes"
              className="border-input bg-transparent text-xs w-full rounded-md border px-2.5 py-1.5 shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none resize-none min-h-[72px]"
              placeholder="e.g. Receiving hours Mon–Fri 9am–5pm"
              {...register('notes')}
            />
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
              {isEditing ? 'Save Changes' : 'Add Address'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
