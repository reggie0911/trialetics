'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PlacesAddressAutocomplete,
  type ParsedPlace,
} from '@/components/ui/places-address-autocomplete';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

import { createSite, updateSite } from '@/lib/actions/sites';
import { SITE_STATUS_OPTIONS } from '@/lib/types/ctms';
import type { StudySite, StudyCountry } from '@/lib/types/ctms';
import { CopilotFillTrigger } from '@/components/copilot/forms/copilot-fill-trigger';
import { StudyIsoDateInput } from '@/components/ctms/studies/study-iso-date-input';

const siteFormSchema = z.object({
  site_number: z.string().min(1, 'Site number is required'),
  name: z.string().min(1, 'Site name is required'),
  study_country_id: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  pi_name: z.string().optional(),
  pi_email: z
    .string()
    .optional()
    .refine(
      (v) => v == null || v.trim() === '' || z.string().email().safeParse(v.trim()).success,
      { message: 'Invalid email' }
    ),
  status: z.enum(['identified', 'selected', 'initiated', 'activated', 'enrolling', 'closed']).optional(),
  activation_date: z.string().optional(),
  target_enrollment: z.coerce.number().min(0).optional(),
});

type SiteFormValues = z.infer<typeof siteFormSchema>;

interface SiteFormProps {
  studyId: string;
  site?: StudySite;
  countries: Pick<StudyCountry, 'id' | 'country_name' | 'country_code'>[];
  mode: 'create' | 'edit';
  onSuccess?: () => void;
  /** When set, navigates to study-scoped site URLs after save. */
  ctmsStudyRouteId?: string;
}

export function SiteForm({
  studyId,
  site,
  countries,
  mode,
  onSuccess,
  ctmsStudyRouteId,
}: SiteFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const siteDetailHref = (sid: string) =>
    ctmsStudyRouteId
      ? `/protected/studies/${ctmsStudyRouteId}/sites/${sid}`
      : `/protected/studies/${studyId}/sites/${sid}`;

  const form = useForm<SiteFormValues>({
    resolver: zodResolver(siteFormSchema),
    defaultValues: {
      site_number: site?.site_number ?? '',
      name: site?.name ?? '',
      study_country_id: site?.study_country_id ?? '',
      address: site?.address ?? '',
      city: site?.city ?? '',
      state: site?.state ?? '',
      postal_code: site?.postal_code ?? '',
      pi_name: site?.pi_name ?? '',
      pi_email: site?.pi_email ?? '',
      status: site?.status ?? 'identified',
      activation_date: site?.activation_date ?? '',
      target_enrollment: site?.target_enrollment ?? 0,
    },
  });

  const studyCountryIdWatched = useWatch({
    control: form.control,
    name: 'study_country_id',
  });
  const statusWatched = useWatch({ control: form.control, name: 'status' });
  const countryBiasForPlaces =
    countries.find((c) => c.id === studyCountryIdWatched)?.country_code ?? null;

  const onAddressPlaceSelected = (parsed: ParsedPlace) => {
    form.setValue('city', parsed.city ?? '', {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    form.setValue('state', parsed.state ?? '', {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    form.setValue('postal_code', parsed.postalCode ?? '', {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    if (!parsed.countryCode) return;
    const match = countries.find((c) => c.country_code === parsed.countryCode);
    if (!match) return;
    const currentId = form.getValues('study_country_id');
    const currentRow = countries.find((c) => c.id === currentId);
    if (currentId && currentRow?.country_code !== parsed.countryCode) {
      return;
    }
    form.setValue('study_country_id', match.id, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  async function onSubmit(values: SiteFormValues) {
    setIsSubmitting(true);
    try {
      const activationDateForSave =
        values.status === 'activated'
          ? (values.activation_date?.trim() || undefined)
          : undefined;

      if (mode === 'create') {
        const { data, error } = await createSite({
          study_id: studyId,
          ...values,
          pi_name: values.pi_name?.trim() || undefined,
          pi_email: values.pi_email?.trim() || undefined,
          activation_date: activationDateForSave,
        });
        if (error) {
          toast.error(error);
          return;
        }
        toast.success('Site created successfully');
        router.push(siteDetailHref(data!.id));
      } else {
        const { error } = await updateSite({
          id: site!.id,
          study_id: studyId,
          ...values,
          // Empty strings so `updateSite` maps them to null; `undefined` would skip the column.
          pi_name: values.pi_name?.trim() ?? '',
          pi_email: values.pi_email?.trim() ?? '',
          // `pi_directory_contact_id` is not part of the form; server keeps the existing FK.
          activation_date: activationDateForSave,
        });
        if (error) {
          toast.error(error);
          return;
        }
        toast.success('Site updated successfully');
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(siteDetailHref(site!.id));
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // When the user accepts proposals from the Copilot fill review card, write
  // the values into RHF without dirtying fields the user already filled.
  // We mark the touched fields so dirty-state tracking still reflects an
  // AI-assisted edit (matters for the form's "unsaved changes" guard).
  const handleCopilotApply = (values: Record<string, unknown>) => {
    for (const [path, value] of Object.entries(values)) {
      form.setValue(path as keyof SiteFormValues, value as never, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Site Information</CardTitle>
            {mode === 'create' ? (
              <CopilotFillTrigger
                schemaId="ctms.site-activation"
                schemaLabel="Site activation"
                scope={{ kind: 'study', id: studyId }}
                studyId={studyId}
                currentValues={form.getValues()}
                onApplied={handleCopilotApply}
              />
            ) : null}
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="site_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., SITE-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., City General Hospital" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {countries.length > 0 && (
              <FormField
                control={form.control}
                name="study_country_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Associated Study Country</FormLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder="Select country"
                            getDisplayLabel={(v) => {
                              if (v == null || v === '') return null;
                              const c = countries.find((x) => x.id === v);
                              return c ? `${c.country_name} (${c.country_code})` : v;
                            }}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Not Assigned</SelectItem>
                        {countries.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.country_name} ({c.country_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={field.value ?? 'identified'}
                    onValueChange={(v) => {
                      field.onChange(v);
                      if (v !== 'activated') {
                        form.setValue('activation_date', '');
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder="Select Status"
                          getDisplayLabel={(v) => SITE_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SITE_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="address"
              render={({ field, fieldState }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <PlacesAddressAutocomplete
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onPlaceSelected={onAddressPlaceSelected}
                      countryBias={countryBiasForPlaces}
                      placeholder="Street address"
                      aria-invalid={fieldState.invalid}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="City" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State / Province</FormLabel>
                  <FormControl>
                    <Input placeholder="State or province" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="postal_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Postal code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enrollment & Timeline</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="target_enrollment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Enrollment</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {statusWatched === 'activated' && (
              <FormField
                control={form.control}
                name="activation_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Activation Date</FormLabel>
                    <FormControl>
                      <StudyIsoDateInput
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        id={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Create Site' : 'Save Changes'}
          </Button>
          {!onSuccess && (
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
