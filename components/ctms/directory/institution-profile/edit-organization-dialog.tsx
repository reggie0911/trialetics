'use client';

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DirectoryCountryRegionFields } from '@/components/ctms/directory/directory-country-region-fields';
import {
  PlacesAddressAutocomplete,
  type ParsedPlace,
} from '@/components/ui/places-address-autocomplete';
import { updateInstitution } from '@/lib/actions/directory-institutions';
import { institutionFormSchema } from '@/lib/validation/directory';
import { INSTITUTION_TYPE_OPTIONS, type InstitutionRow } from '@/lib/types/directory';

import type { ProfileCopy } from './utils';

export interface EditOrganizationDialogProps {
  institution: InstitutionRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: ProfileCopy;
  /** Optional name of the field to focus on first ("address_line1"). */
  initialFocus?: 'name' | 'address_line1' | null;
}

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs disabled:opacity-50';

export function EditOrganizationDialog({
  institution,
  open,
  onOpenChange,
  copy,
  initialFocus = null,
}: EditOrganizationDialogProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const form = useForm<
    z.input<typeof institutionFormSchema>,
    unknown,
    z.infer<typeof institutionFormSchema>
  >({
    resolver: zodResolver(institutionFormSchema),
    defaultValues: {
      name: institution.name,
      organization_type: institution.organization_type,
      address_line1: institution.address_line1 ?? '',
      address_line2: institution.address_line2 ?? '',
      city: institution.city ?? '',
      state_region: institution.state_region ?? '',
      postal_code: institution.postal_code ?? '',
      country_code: institution.country_code ?? '',
      region: institution.region ?? '',
      status: institution.status,
      notes: institution.notes ?? '',
      parent_institution_id: institution.parent_institution_id ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: institution.name,
        organization_type: institution.organization_type,
        address_line1: institution.address_line1 ?? '',
        address_line2: institution.address_line2 ?? '',
        city: institution.city ?? '',
        state_region: institution.state_region ?? '',
        postal_code: institution.postal_code ?? '',
        country_code: institution.country_code ?? '',
        region: institution.region ?? '',
        status: institution.status,
        notes: institution.notes ?? '',
        parent_institution_id: institution.parent_institution_id ?? '',
      });
    }
    // We intentionally only reset when `open` flips; depending on `institution` would
    // overwrite in-flight edits when the parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, institution.id]);

  useEffect(() => {
    if (!open || !initialFocus) return;
    const t = setTimeout(() => {
      form.setFocus(initialFocus);
    }, 80);
    return () => clearTimeout(t);
  }, [open, initialFocus, form]);

  const watchedCountryCode = useWatch({ control: form.control, name: 'country_code' });
  const watchedRegion = useWatch({ control: form.control, name: 'region' });

  const onAddressPlaceSelected = (parsed: ParsedPlace) => {
    form.setValue('city', parsed.city ?? '', { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    const regionLabel = parsed.stateLong ?? parsed.state ?? '';
    form.setValue('state_region', regionLabel, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    form.setValue('region', regionLabel, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    form.setValue('postal_code', parsed.postalCode ?? '', { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    const cc = form.getValues('country_code');
    if (parsed.countryCode && (!cc || cc === parsed.countryCode)) {
      form.setValue('country_code', parsed.countryCode, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    startTransition(async () => {
      const { error, duplicateNameWarning } = await updateInstitution(institution.id, {
        ...values,
        parent_institution_id: institution.parent_institution_id ?? null,
        address_line1: values.address_line1 || undefined,
        address_line2: values.address_line2 || undefined,
        city: values.city || undefined,
        state_region: values.state_region || undefined,
        postal_code: values.postal_code || undefined,
        country_code: values.country_code || undefined,
        region: values.region || undefined,
        notes: values.notes || undefined,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(`${copy.entityNoun} updated`);
      if (duplicateNameWarning) {
        toast.message(
          'Another organization shares this name — review linked sites and contacts before merging.',
        );
      }
      onOpenChange(false);
      router.refresh();
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{copy.editLabel}</DialogTitle>
          <DialogDescription>
            Update the organization profile. Changes apply across all linked studies and sites.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input className="text-xs h-9" {...form.register('name')} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Organization type</Label>
            <select className={selectClass} {...form.register('organization_type')}>
              {INSTITUTION_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <Controller
            name="address_line1"
            control={form.control}
            render={({ field, fieldState }) => (
              <div className="space-y-1">
                <Label className="text-xs">Address line 1</Label>
                <PlacesAddressAutocomplete
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onPlaceSelected={onAddressPlaceSelected}
                  countryBias={watchedCountryCode || null}
                  aria-invalid={fieldState.invalid}
                  className="text-xs h-9"
                />
              </div>
            )}
          />
          <DirectoryCountryRegionFields
            variant="institutionAddress"
            countryCode={watchedCountryCode ?? ''}
            region={watchedRegion ?? ''}
            onCountryChange={(c) => {
              form.setValue('country_code', c, { shouldDirty: true });
            }}
            onRegionChange={(r) => form.setValue('region', r, { shouldDirty: true })}
            citySlot={
              <div className="space-y-1">
                <Label className="text-xs">City</Label>
                <Input className="text-xs h-9" {...form.register('city')} />
              </div>
            }
          />
          <div className="space-y-1">
            <Label className="text-xs">Postal code</Label>
            <Input className="text-xs h-9" {...form.register('postal_code')} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <select className={selectClass} {...form.register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="text-xs" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
