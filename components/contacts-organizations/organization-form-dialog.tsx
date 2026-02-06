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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createOrganization, updateOrganization } from '@/lib/actions/organizations';
import { createAddress, updateAddress, getAddressesByEntity } from '@/lib/actions/addresses';
import { formatPhoneNumber, capitalizeFirstLetter } from '@/lib/utils';
import {
  Organization,
  OrganizationType,
  EntityStatus,
  ORGANIZATION_TYPE_LABELS,
  ENTITY_STATUS_LABELS,
} from '@/lib/types/contacts-organizations';
import { AddressForm, AddressFormData, emptyAddress, hasAddressData } from './address-form';

const organizationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  organization_type: z.enum(['site', 'sponsor', 'cro', 'vendor', 'lab', 'irb', 'regulatory']),
  status: z.enum(['active', 'inactive', 'pending']),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  notes: z.string().optional(),
});

type OrganizationFormValues = z.infer<typeof organizationSchema>;

interface OrganizationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  organization?: Organization | null;
  companyId: string;
  profileId: string;
  userEmail: string;
}

export function OrganizationFormDialog({
  open,
  onOpenChange,
  onSuccess,
  organization,
  companyId,
  profileId,
  userEmail,
}: OrganizationFormDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressData, setAddressData] = useState<AddressFormData>(emptyAddress);
  const [existingAddressId, setExistingAddressId] = useState<string | null>(null);
  const isEditing = !!organization;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      organization_type: 'site',
      status: 'active',
      email: '',
      phone: '',
      website: '',
      notes: '',
    },
  });

  const selectedType = watch('organization_type');
  const selectedStatus = watch('status');

  // Reset form when dialog opens/closes or organization changes
  useEffect(() => {
    if (open) {
      if (organization) {
        reset({
          name: organization.name,
          organization_type: organization.organization_type,
          status: organization.status,
          email: organization.email || '',
          phone: organization.phone || '',
          website: organization.website || '',
          notes: organization.notes || '',
        });
        // Load existing address if editing
        loadExistingAddress(organization.id);
      } else {
        reset({
          name: '',
          organization_type: 'site',
          status: 'active',
          email: '',
          phone: '',
          website: '',
          notes: '',
        });
        setAddressData(emptyAddress);
        setExistingAddressId(null);
      }
    }
  }, [open, organization, reset]);

  const loadExistingAddress = async (orgId: string) => {
    const result = await getAddressesByEntity('organization', orgId);
    if (result.success && result.data && result.data.length > 0) {
      const addr = result.data[0];
      setExistingAddressId(addr.id);
      setAddressData({
        address_type: addr.address_type,
        street_1: addr.street_1 || '',
        street_2: addr.street_2 || '',
        city: addr.city || '',
        state: addr.state || '',
        postal_code: addr.postal_code || '',
        country: addr.country || 'United States',
        is_primary: addr.is_primary,
      });
    } else {
      setAddressData(emptyAddress);
      setExistingAddressId(null);
    }
  };

  const onSubmit = async (values: OrganizationFormValues) => {
    setIsSubmitting(true);
    try {
      let result;
      let orgId: string;

      if (isEditing && organization) {
        result = await updateOrganization({
          id: organization.id,
          name: values.name,
          organization_type: values.organization_type as OrganizationType,
          status: values.status as EntityStatus,
          email: values.email || null,
          phone: values.phone || null,
          website: values.website || null,
          notes: values.notes || null,
        });
        orgId = organization.id;
      } else {
        result = await createOrganization(companyId, profileId, userEmail, {
          name: values.name,
          organization_type: values.organization_type as OrganizationType,
          status: values.status as EntityStatus,
          email: values.email || null,
          phone: values.phone || null,
          website: values.website || null,
          notes: values.notes || null,
        });
        orgId = result.data?.id || '';
      }

      if (result.success) {
        // Handle address creation/update
        if (hasAddressData(addressData) && orgId) {
          if (existingAddressId) {
            await updateAddress({
              id: existingAddressId,
              ...addressData,
            });
          } else {
            await createAddress({
              entity_type: 'organization',
              entity_id: orgId,
              ...addressData,
            });
          }
        }

        toast({
          title: isEditing ? 'Organization updated' : 'Organization created',
          description: `${values.name} has been ${isEditing ? 'updated' : 'created'} successfully.`,
        });
        onSuccess();
      } else {
        toast({
          title: 'Error',
          description: result.error || `Failed to ${isEditing ? 'update' : 'create'} organization`,
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xs">
            {isEditing ? 'Edit Organization' : 'New Organization'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing
              ? 'Update the organization details below.'
              : 'Add a new organization to your contacts database.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs">Organization Name *</Label>
              <Input
                id="name"
                placeholder="Enter name..."
                className="text-xs placeholder:text-xs md:text-xs h-8"
                value={watch('name') || ''}
                onChange={(e) => {
                  const capitalized = capitalizeFirstLetter(e.target.value);
                  setValue('name', capitalized, { shouldValidate: true });
                }}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="organization_type" className="text-xs">Type *</Label>
              <Select
                value={selectedType}
                onValueChange={(value) => value && setValue('organization_type', value as OrganizationType)}
              >
                <SelectTrigger className="text-xs h-8 w-full">
                  <span className="text-xs">
                    {selectedType ? ORGANIZATION_TYPE_LABELS[selectedType as OrganizationType] || selectedType : 'Select type'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ORGANIZATION_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.organization_type && (
                <p className="text-xs text-destructive">{errors.organization_type.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@example.com"
                className="text-xs placeholder:text-xs md:text-xs h-8"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone" className="text-xs">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                className="text-xs placeholder:text-xs md:text-xs h-8"
                value={watch('phone') || ''}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  setValue('phone', formatted, { shouldValidate: true });
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="website" className="text-xs">Website</Label>
              <Input
                id="website"
                placeholder="https://example.com"
                className="text-xs placeholder:text-xs md:text-xs h-8"
                {...register('website')}
              />
              {errors.website && (
                <p className="text-xs text-destructive">{errors.website.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="status" className="text-xs">Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => value && setValue('status', value as EntityStatus)}
              >
                <SelectTrigger className="text-xs h-8 w-full">
                  <span className="text-xs capitalize">
                    {selectedStatus ? ENTITY_STATUS_LABELS[selectedStatus as EntityStatus] || selectedStatus : 'Select status'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ENTITY_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Address Section */}
          <AddressForm
            value={addressData}
            onChange={setAddressData}
            defaultOpen={isEditing && hasAddressData(addressData)}
          />

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this organization..."
              className="resize-none text-xs placeholder:text-xs md:text-xs"
              rows={3}
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
                isEditing ? 'Update Organization' : 'Create Organization'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
