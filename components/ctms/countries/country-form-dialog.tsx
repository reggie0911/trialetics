'use client';

import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { StudyCountry, CountryStatus, RegulatoryStatus } from '@/lib/types/ctms';
import { COUNTRY_STATUS_OPTIONS, REGULATORY_STATUS_OPTIONS } from '@/lib/types/ctms';
import { COUNTRIES, countriesForSelectList } from '@/lib/data/countries';
import { addStudyCountry, updateStudyCountry } from '@/lib/actions/countries';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const addSchema = z.object({
  country_code: z.string().min(1, 'Please select a country'),
  status: z.string().min(1),
  regulatory_status: z.string().min(1),
});

const editSchema = z.object({
  status: z.string().min(1),
});

type CountryFormValues = {
  country_code?: string;
  status: string;
  regulatory_status?: string;
};

interface CountryFormDialogProps {
  studyId: string;
  existingCodes: string[];
  country?: StudyCountry;
  onSuccess: () => void;
  /** When true, the trigger is disabled (e.g. study deactivated). */
  disabled?: boolean;
  /** Shown on hover when `disabled` is true. */
  disabledTooltip?: string;
  /** When provided, dialog is controlled and the internal trigger is not rendered. */
  controlledOpen?: boolean;
  onControlledOpenChange?: (next: boolean) => void;
}

export function CountryFormDialog({
  studyId,
  existingCodes,
  country,
  onSuccess,
  disabled = false,
  disabledTooltip,
  controlledOpen,
  onControlledOpenChange,
}: CountryFormDialogProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (isControlled) {
      onControlledOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  };
  const isEdit = !!country;

  const form = useForm<CountryFormValues>({
    resolver: zodResolver(isEdit ? editSchema : addSchema) as Resolver<CountryFormValues>,
    defaultValues: isEdit
      ? {
          status: country.status,
          regulatory_status: country.regulatory_status,
        }
      : {
          country_code: '',
          status: 'planned' as CountryStatus,
          regulatory_status: 'not_started' as RegulatoryStatus,
        },
  });

  const availableCountries = countriesForSelectList().filter(
    (c) => !existingCodes.includes(c.code) || (isEdit && c.code === country?.country_code)
  );

  const onSubmit = async (values: Record<string, string>) => {
    if (isEdit) {
      const { error } = await updateStudyCountry({
        id: country.id,
        study_id: studyId,
        status: values.status as CountryStatus,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Country updated');
    } else {
      const selectedCountry = COUNTRIES.find((c) => c.code === values.country_code);
      if (!selectedCountry) {
        toast.error('Please select a valid country');
        return;
      }
      const { error } = await addStudyCountry({
        study_id: studyId,
        country_code: selectedCountry.code,
        country_name: selectedCountry.name,
        status: values.status as CountryStatus,
        regulatory_status: values.regulatory_status as RegulatoryStatus,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Country added');
    }

    setOpen(false);
    form.reset();
    onSuccess();
  };

  const handleOpenChange = (next: boolean) => {
    if (disabled && next) return;
    setOpen(next);
  };

  const trigger = (
    <DialogTrigger
      render={
        isEdit ? (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={disabled} />
        ) : (
          <Button size="sm" disabled={disabled} />
        )
      }
    >
      {isEdit ? (
        <Pencil className="h-3.5 w-3.5" />
      ) : (
        <>
          <Plus className="mr-2 h-4 w-4" />
          Add Country
        </>
      )}
    </DialogTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {isControlled ? null : disabled && disabledTooltip ? (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>{trigger}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs">
            {disabledTooltip}
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Country' : 'Add Country'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Update participation status for ${country.country_name}. Regulatory status is computed from submission rows.`
              : 'Add a country to this study.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="country_code">Country</Label>
              <Select
                value={form.watch('country_code')}
                onValueChange={(val) => form.setValue('country_code', val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder="Select a country"
                    getDisplayLabel={(v) => COUNTRIES.find((c) => c.code === v)?.name ?? v}
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableCountries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.country_code && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.country_code.message as string}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="status">Participation Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(val) => form.setValue('status', val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder="Select Participation Status"
                  getDisplayLabel={(v) => COUNTRY_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v}
                />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="regulatory_status">Regulatory Status</Label>
              <Select
                value={form.watch('regulatory_status')}
                onValueChange={(val) => form.setValue('regulatory_status', val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder="Select Regulatory Status"
                    getDisplayLabel={(v) => REGULATORY_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v}
                  />
                </SelectTrigger>
                <SelectContent>
                  {REGULATORY_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? 'Saving...'
                : isEdit
                  ? 'Save Changes'
                  : 'Add Country'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
