'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Archive, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

import { createStudy, updateStudy, getCompanyName } from '@/lib/actions/studies';
import { STUDY_PHASE_OPTIONS, STUDY_STATUS_OPTIONS } from '@/lib/types/ctms';
import type { Study } from '@/lib/types/ctms';
import type { StudyOverview } from '@/lib/validation/study-overview';
import {
  normalizeStudyRegionsInput,
  parseStudyOverview,
  studyOverviewToDbValue,
} from '@/lib/validation/study-overview';
import { TRIP_REPORT_DAYS_BASIS_LABELS } from '@/lib/types/visit-reports';
import { StudyCountryMultiSelect } from '@/components/ctms/studies/study-country-multi-select';
import { StudyIsoDateInput } from '@/components/ctms/studies/study-iso-date-input';
import { CopilotFillTrigger } from '@/components/copilot/forms/copilot-fill-trigger';
import { DeactivateStudyDialog } from '@/components/ctms/studies/deactivate-study-dialog';

const overviewFormSchema = z.object({
  study_type: z.string().optional(),
  design: z.string().optional(),
  estimated_enrollment: z.string().optional(),
  study_duration_months: z.string().optional(),
  population: z.string().optional(),
  primary_objective: z.string().optional(),
  secondary_objectives_text: z.string().optional(),
  regions: z.array(z.string()),
  site_count_summary: z.string().optional(),
  site_types: z.string().optional(),
  trip_report_submission_days: z.string().optional(),
  trip_report_approval_days: z.string().optional(),
  trip_report_days_basis: z.enum(['calendar', 'business']),
});

const studyFormSchema = z.object({
  protocol_number: z.string().min(1, 'Protocol number is required'),
  study_name: z
    .string()
    .trim()
    .min(1, 'Study name is required')
    .max(500, 'Study name must be at most 500 characters'),
  title: z.string().min(1, 'Study title is required'),
  phase: z.enum(['Phase I', 'Phase II', 'Phase III', 'Phase IV', 'Phase I/II', 'Phase II/III'], {
    required_error: 'Phase is required',
  }),
  therapeutic_area: z.string().optional(),
  indication: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'closed', 'on_hold']).optional(),
  sponsor: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  description: z.string().optional(),
  overview: overviewFormSchema,
});

type StudyFormValues = z.infer<typeof studyFormSchema>;

function defaultOverviewFromStudy(study?: Study): StudyFormValues['overview'] {
  const o = study?.overview ?? null;
  return {
    study_type: o?.study_type ?? '',
    design: o?.design ?? '',
    estimated_enrollment: o?.estimated_enrollment != null ? String(o.estimated_enrollment) : '',
    study_duration_months: o?.study_duration_months != null ? String(o.study_duration_months) : '',
    population: o?.population ?? '',
    primary_objective: o?.primary_objective ?? '',
    secondary_objectives_text: o?.secondary_objectives?.join('\n') ?? '',
    regions: normalizeStudyRegionsInput(o?.study_sites?.regions) ?? [],
    site_count_summary: o?.study_sites?.site_count_summary ?? '',
    site_types: o?.study_sites?.site_types ?? '',
    trip_report_submission_days:
      o?.trip_report_timing?.report_submission_days != null
        ? String(o.trip_report_timing.report_submission_days)
        : '',
    trip_report_approval_days:
      o?.trip_report_timing?.report_approval_days != null
        ? String(o.trip_report_timing.report_approval_days)
        : '',
    trip_report_days_basis: o?.trip_report_timing?.days_basis ?? 'calendar',
  };
}

function buildStudyOverviewForSave(ov: StudyFormValues['overview']): StudyOverview | null {
  const parseNum = (s: string | undefined): number | undefined => {
    const t = s?.trim() ?? '';
    if (!t) return undefined;
    const n = Number.parseInt(t, 10);
    return Number.isFinite(n) ? n : undefined;
  };

  const enr = parseNum(ov.estimated_enrollment);
  const dur = parseNum(ov.study_duration_months);
  const subD = parseNum(ov.trip_report_submission_days);
  const appD = parseNum(ov.trip_report_approval_days);

  const secondary =
    ov.secondary_objectives_text
      ?.split('\n')
      .map((l) => l.trim())
      .filter(Boolean) ?? [];

  const hasRegions = ov.regions.length > 0;
  const hasSites =
    hasRegions || [ov.site_count_summary, ov.site_types].some((s) => s?.trim());

  const tripFieldText = Boolean(
    ov.trip_report_submission_days?.trim() || ov.trip_report_approval_days?.trim(),
  );
  const tripHasPositiveDays =
    (subD !== undefined && subD > 0) || (appD !== undefined && appD > 0);
  const includeTripTiming =
    tripHasPositiveDays ||
    ov.trip_report_days_basis === 'business' ||
    (ov.trip_report_days_basis === 'calendar' && tripFieldText);

  const candidate: StudyOverview = {
    study_type: ov.study_type?.trim() || undefined,
    design: ov.design?.trim() || undefined,
    estimated_enrollment: enr,
    study_duration_months: dur,
    population: ov.population?.trim() || undefined,
    primary_objective: ov.primary_objective?.trim() || undefined,
    secondary_objectives: secondary.length ? secondary : undefined,
    study_sites: hasSites
      ? {
          regions: hasRegions ? ov.regions : undefined,
          site_count_summary: ov.site_count_summary?.trim() || undefined,
          site_types: ov.site_types?.trim() || undefined,
        }
      : undefined,
    trip_report_timing: includeTripTiming
      ? {
          report_submission_days: subD && subD > 0 ? subD : undefined,
          report_approval_days: appD && appD > 0 ? appD : undefined,
          days_basis: ov.trip_report_days_basis,
        }
      : undefined,
  };

  const dbVal = studyOverviewToDbValue(candidate);
  if (!dbVal) return null;
  return parseStudyOverview(dbVal) ?? null;
}

interface StudyFormProps {
  study?: Study;
  mode: 'create' | 'edit';
  onSuccess?: () => void;
  /** When true and `mode` is edit, show Deactivate study in the footer (admins only). */
  isAdmin?: boolean;
}

export function StudyForm({
  study,
  mode,
  onSuccess,
  isAdmin = false,
}: StudyFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  /** Snapshot of country codes when the edit form loaded — used to detect destructive removals. */
  const initialRegionCodesRef = useRef<string[] | null>(null);

  const handleDeactivateSuccess = useCallback(() => {
    if (!study?.id) return;
    router.push(`/protected/studies/${study.id}?tab=overview&readOnly=1`);
  }, [router, study?.id]);

  const form = useForm<StudyFormValues>({
    resolver: zodResolver(studyFormSchema),
    defaultValues: {
      protocol_number: study?.protocol_number ?? '',
      study_name: study?.study_name ?? '',
      title: study?.title ?? '',
      phase: study?.phase ?? undefined,
      therapeutic_area: study?.therapeutic_area ?? '',
      indication: study?.indication ?? '',
      status: study?.status ?? 'draft',
      sponsor: study?.sponsor ?? '',
      start_date: study?.start_date ?? '',
      end_date: study?.end_date ?? '',
      description: study?.description ?? '',
      overview: defaultOverviewFromStudy(study),
    },
  });

  useEffect(() => {
    if (mode === 'create' && !form.getValues('sponsor')) {
      getCompanyName().then((name) => {
        if (name) form.setValue('sponsor', name);
      });
    }
  }, [mode, form]);

  useEffect(() => {
    if (mode === 'edit' && study) {
      initialRegionCodesRef.current =
        normalizeStudyRegionsInput(study.overview?.study_sites?.regions) ?? [];
    } else {
      initialRegionCodesRef.current = null;
    }
  }, [mode, study?.id, study?.overview]);

  async function onSubmit(values: StudyFormValues) {
    setIsSubmitting(true);

    try {
      if (mode === 'edit' && initialRegionCodesRef.current?.length) {
        const current = new Set(values.overview.regions);
        const removed = initialRegionCodesRef.current.filter((c) => !current.has(c));
        if (removed.length > 0) {
          const ok = window.confirm(
            `Removing ${removed.length} country(ies) from the study will also delete any regulatory submissions tied to them. Continue?`,
          );
          if (!ok) return;
        }
      }

      const { overview: overviewForm, ...restValues } = values;
      const overview = buildStudyOverviewForSave(overviewForm);

      if (mode === 'create') {
        const { data, error } = await createStudy({
          ...restValues,
          sponsor_institution_id: null,
          overview,
        });
        if (error) {
          toast.error(error);
          return;
        }
        toast.success('Study created successfully');
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/protected/studies/${data!.id}`);
        }
      } else {
        const { error } = await updateStudy({
          id: study!.id,
          ...restValues,
          overview,
        });
        if (error) {
          toast.error(error);
          return;
        }
        toast.success('Study updated successfully');
        router.push(`/protected/studies/${study!.id}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Apply Copilot-proposed values into RHF. Only writes top-level study
  // fields; the structured `overview` block has its own editor and isn't
  // covered by the registered `ctms.study-overview` schema.
  const handleCopilotApply = (values: Record<string, unknown>) => {
    for (const [path, value] of Object.entries(values)) {
      // Skip nested overview keys — current registered schema is flat.
      if (path.includes('.')) continue;
      form.setValue(path as keyof StudyFormValues, value as never, {
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
            <CardTitle>Study Information</CardTitle>
            {mode === 'create' ? (
              <CopilotFillTrigger
                schemaId="ctms.study-overview"
                schemaLabel="Study overview"
                scope={{ kind: 'study' }}
                currentValues={form.getValues() as Record<string, unknown>}
                onApplied={handleCopilotApply}
              />
            ) : null}
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="study_name"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                                   <FormLabel>
                    Study name
                    <span className="text-destructive" aria-hidden="true">
                      {' '}
                      *
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="text-xs"
                      placeholder="Short or display name"
                      required
                      aria-required
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Study title</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter full study title"
                      rows={3}
                      className="min-h-[4.5rem] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="protocol_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Protocol Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., PROTO-2026-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phase</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? null}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder="Select phase"
                          getDisplayLabel={(v) => STUDY_PHASE_OPTIONS.find((o) => o.value === v)?.label ?? null}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STUDY_PHASE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? null}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder="Select status"
                          getDisplayLabel={(v) => STUDY_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? null}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STUDY_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="therapeutic_area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Therapeutic Area</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Oncology" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="indication"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indication</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Non-Small Cell Lung Cancer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sponsor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sponsor (display name)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., company or protocol sponsor label"
                      className="text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <StudyIsoDateInput
                      value={field.value ?? ''}
                      onChange={(iso) => {
                        form.clearErrors('start_date');
                        field.onChange(iso);
                      }}
                      onBlur={field.onBlur}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <StudyIsoDateInput
                      value={field.value ?? ''}
                      onChange={(iso) => {
                        form.clearErrors('end_date');
                        field.onChange(iso);
                      }}
                      onBlur={field.onBlur}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Study overview</CardTitle>
            <p className="text-xs text-muted-foreground font-normal">
              Protocol summary for the study detail page (design, objectives, monitoring, trip report timing policy).
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="overview.study_type"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Study type</FormLabel>
                  <FormControl>
                    <Input className="text-xs" placeholder="e.g. Interventional (Randomized, Double-blind)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="overview.design"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Design</FormLabel>
                  <FormControl>
                    <Input className="text-xs" placeholder="e.g. Multicenter, Global, Parallel-group" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="overview.estimated_enrollment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated enrollment</FormLabel>
                  <FormControl>
                    <Input className="text-xs" inputMode="numeric" placeholder="e.g. 850" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="overview.study_duration_months"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Study duration (months)</FormLabel>
                  <FormControl>
                    <Input className="text-xs" inputMode="numeric" placeholder="e.g. 36" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="overview.population"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Population</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[80px] resize-y text-xs"
                      placeholder="Target population description"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="overview.primary_objective"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Primary objective</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[80px] text-xs" placeholder="Primary objective" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="overview.secondary_objectives_text"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Key secondary objectives</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[100px] text-xs"
                      placeholder="One objective per line"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="overview.regions"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Countries</FormLabel>
                  <FormControl>
                    <StudyCountryMultiSelect
                      id={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                      aria-invalid={Boolean(form.formState.errors.overview?.regions)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="overview.site_count_summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of sites</FormLabel>
                  <FormControl>
                    <Input className="text-xs" placeholder="e.g. ~80–100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="overview.site_types"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site type</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[4.5rem] resize-y text-xs"
                      placeholder="e.g. Rheumatology centers"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-2 border-t pt-4 space-y-4">
              <p className="text-xs font-medium text-foreground">Monitoring trip report due dates</p>
              <p className="text-xs text-muted-foreground">
                Study-level policy. Template settings drive actual due dates on reports; use the same day basis there for consistency.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="overview.trip_report_submission_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount of days for report submission</FormLabel>
                      <FormControl>
                        <Input className="text-xs" inputMode="numeric" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="overview.trip_report_approval_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount of days for report approval</FormLabel>
                      <FormControl>
                        <Input className="text-xs" inputMode="numeric" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="overview.trip_report_days_basis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day count</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-xs">
                            <SelectValue
                              getDisplayLabel={(v) => (v ? TRIP_REPORT_DAYS_BASIS_LABELS[v as 'calendar' | 'business'] : null)}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="calendar" className="text-xs">
                            {TRIP_REPORT_DAYS_BASIS_LABELS.calendar}
                          </SelectItem>
                          <SelectItem value="business" className="text-xs">
                            {TRIP_REPORT_DAYS_BASIS_LABELS.business}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Enter study description, objectives, and key details..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Create Study' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
          {mode === 'edit' && isAdmin && study && (
            <>
              <Button
                type="button"
                variant="destructive"
                className="border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30"
                onClick={() => setDeactivateOpen(true)}
              >
                <Archive className="mr-2 h-4 w-4" />
                Deactivate study
              </Button>
              <DeactivateStudyDialog
                study={{ id: study.id, title: study.title }}
                open={deactivateOpen}
                onOpenChange={setDeactivateOpen}
                onSuccess={handleDeactivateSuccess}
              />
            </>
          )}
        </div>
      </form>
    </Form>
  );
}
