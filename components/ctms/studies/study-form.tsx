'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

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
import { parseStudyOverview, studyOverviewToDbValue } from '@/lib/validation/study-overview';
import { TRIP_REPORT_DAYS_BASIS_LABELS } from '@/lib/types/visit-reports';

/** Sentinel for optional directory / institution selects (Radix Select disallows empty string values). */
const DIRECTORY_LINK_NONE = '__none__';

const overviewFormSchema = z.object({
  study_type: z.string().optional(),
  design: z.string().optional(),
  estimated_enrollment: z.string().optional(),
  study_duration_months: z.string().optional(),
  population: z.string().optional(),
  primary_objective: z.string().optional(),
  secondary_objectives_text: z.string().optional(),
  regions: z.string().optional(),
  site_count_summary: z.string().optional(),
  site_types: z.string().optional(),
  monitoring_type: z.string().optional(),
  sdv: z.string().optional(),
  monitoring_visit_types_text: z.string().optional(),
  trip_report_submission_days: z.string().optional(),
  trip_report_approval_days: z.string().optional(),
  trip_report_days_basis: z.enum(['calendar', 'business']),
});

const studyFormSchema = z.object({
  protocol_number: z.string().min(1, 'Protocol number is required'),
  title: z.string().min(1, 'Study title is required'),
  phase: z.enum(['Phase I', 'Phase II', 'Phase III', 'Phase IV', 'Phase I/II', 'Phase II/III'], {
    required_error: 'Phase is required',
  }),
  therapeutic_area: z.string().optional(),
  indication: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'closed', 'on_hold']).optional(),
  sponsor: z.string().optional(),
  sponsor_institution_id: z.string().optional(),
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
    regions: o?.study_sites?.regions ?? '',
    site_count_summary: o?.study_sites?.site_count_summary ?? '',
    site_types: o?.study_sites?.site_types ?? '',
    monitoring_type: o?.monitoring?.monitoring_type ?? '',
    sdv: o?.monitoring?.sdv ?? '',
    monitoring_visit_types_text: o?.monitoring?.visit_types?.join('\n') ?? '',
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
  const visitTypes =
    ov.monitoring_visit_types_text
      ?.split('\n')
      .map((l) => l.trim())
      .filter(Boolean) ?? [];

  const hasSites = [ov.regions, ov.site_count_summary, ov.site_types].some((s) => s?.trim());
  const hasMon =
    Boolean(ov.monitoring_type?.trim()) ||
    Boolean(ov.sdv?.trim()) ||
    visitTypes.length > 0;

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
          regions: ov.regions?.trim() || undefined,
          site_count_summary: ov.site_count_summary?.trim() || undefined,
          site_types: ov.site_types?.trim() || undefined,
        }
      : undefined,
    monitoring: hasMon
      ? {
          monitoring_type: ov.monitoring_type?.trim() || undefined,
          sdv: ov.sdv?.trim() || undefined,
          visit_types: visitTypes.length ? visitTypes : undefined,
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
  institutionOptions?: { id: string; name: string }[];
}

export function StudyForm({
  study,
  mode,
  onSuccess,
  institutionOptions = [],
}: StudyFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<StudyFormValues>({
    resolver: zodResolver(studyFormSchema),
    defaultValues: {
      protocol_number: study?.protocol_number ?? '',
      title: study?.title ?? '',
      phase: study?.phase ?? undefined,
      therapeutic_area: study?.therapeutic_area ?? '',
      indication: study?.indication ?? '',
      status: study?.status ?? 'draft',
      sponsor: study?.sponsor ?? '',
      sponsor_institution_id:
        study?.sponsor_institution_id && study.sponsor_institution_id.length > 0
          ? study.sponsor_institution_id
          : DIRECTORY_LINK_NONE,
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

  async function onSubmit(values: StudyFormValues) {
    setIsSubmitting(true);

    try {
      const sponsorInstitutionId =
        values.sponsor_institution_id === DIRECTORY_LINK_NONE
          ? null
          : values.sponsor_institution_id || null;

      const { overview: overviewForm, ...restValues } = values;
      const overview = buildStudyOverviewForSave(overviewForm);

      if (mode === 'create') {
        const { data, error } = await createStudy({
          ...restValues,
          sponsor_institution_id: sponsorInstitutionId,
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
          sponsor_institution_id: sponsorInstitutionId,
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Study Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
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
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Study Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter study title" {...field} />
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
              name="sponsor_institution_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sponsor organization (directory)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? DIRECTORY_LINK_NONE}
                  >
                    <FormControl>
                      <SelectTrigger className="text-xs">
                        <SelectValue
                          placeholder="Link to an organization"
                          getDisplayLabel={(v) =>
                            v === DIRECTORY_LINK_NONE
                              ? 'Not linked'
                              : institutionOptions.find((o) => o.id === v)?.name ?? v
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={DIRECTORY_LINK_NONE} className="text-xs">
                        Not linked
                      </SelectItem>
                      {institutionOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id} className="text-xs">
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <Input type="date" {...field} />
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
                    <Input type="date" {...field} />
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
                    <Input className="text-xs" placeholder="Target population description" {...field} />
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
                  <FormLabel>Study sites — Regions</FormLabel>
                  <FormControl>
                    <Input className="text-xs" placeholder="e.g. United States, Europe, Asia-Pacific" {...field} />
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
                    <Input className="text-xs" placeholder="e.g. Rheumatology centers" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="overview.monitoring_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monitoring type</FormLabel>
                  <FormControl>
                    <Input className="text-xs" placeholder="e.g. Risk-Based Monitoring (RBM)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="overview.sdv"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SDV</FormLabel>
                  <FormControl>
                    <Input className="text-xs" placeholder="e.g. Targeted SDV" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="overview.monitoring_visit_types_text"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Visit types</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[80px] text-xs"
                      placeholder="One visit type per line (e.g. Site Initiation Visit (SIV))"
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

        <div className="flex items-center gap-3">
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
      </form>
    </Form>
  );
}
