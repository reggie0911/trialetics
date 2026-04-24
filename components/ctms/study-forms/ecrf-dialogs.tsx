'use client';

import { useEffect } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type {
  StudyCrf,
  StudyCrfQuestion,
  StudyVisitDefinition,
  QuestionType,
} from '@/lib/types/ctms';
import { QUESTION_TYPE_OPTIONS } from '@/lib/types/ctms';
import {
  createStudyVisitDefinition,
  updateStudyVisitDefinition,
} from '@/lib/actions/study-visit-definitions';
import {
  createStudyCrf,
  updateStudyCrf,
  createCrfQuestion,
  updateCrfQuestion,
} from '@/lib/actions/study-crfs';

// ─── Visit Form Dialog ─────────────────────────────────────────────────────────

const nonNegativeIntField = z
  .string()
  .optional()
  .refine(
    (raw) => {
      if (!raw || raw.trim() === '') return true;
      const n = Number(raw);
      return Number.isFinite(n) && Number.isInteger(n) && n >= 0;
    },
    { message: 'Must be a whole number ≥ 0' },
  );

const visitSchema = z.object({
  visit_name: z.string().min(1, 'Visit name is required'),
  timepoint_label: z.string().optional(),
  timepoint_days: z.string().optional(),
  window_before_days: nonNegativeIntField,
  window_after_days: nonNegativeIntField,
});
type VisitFormValues = z.infer<typeof visitSchema>;

function parseTimepointDays(raw: string | undefined): number | null {
  if (!raw || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseNonNegativeInt(raw: string | undefined): number {
  if (!raw || raw.trim() === '') return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

export function VisitFormDialog({
  studyId,
  visit,
  nextSortOrder,
  versionId,
  open,
  onOpenChange,
  onSuccess,
}: {
  studyId: string;
  visit?: StudyVisitDefinition;
  nextSortOrder?: number;
  versionId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const isEdit = !!visit;

  const defaults: VisitFormValues = isEdit
    ? {
        visit_name: visit.visit_name,
        timepoint_label: visit.timepoint_label ?? '',
        timepoint_days:
          typeof visit.timepoint_days === 'number' ? String(visit.timepoint_days) : '',
        window_before_days: String(visit.window_before_days ?? 0),
        window_after_days: String(visit.window_after_days ?? 0),
      }
    : {
        visit_name: '',
        timepoint_label: '',
        timepoint_days: '',
        window_before_days: '0',
        window_after_days: '0',
      };

  const form = useForm<VisitFormValues>({
    resolver: zodResolver(visitSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (open) form.reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, visit?.id]);

  const onSubmit = form.handleSubmit(async (values) => {
    const timepointDays = parseTimepointDays(values.timepoint_days);
    const labelTrimmed = values.timepoint_label?.trim() || null;
    const windowBefore = parseNonNegativeInt(values.window_before_days);
    const windowAfter = parseNonNegativeInt(values.window_after_days);
    if (isEdit) {
      const { error } = await updateStudyVisitDefinition(visit.id, studyId, {
        visit_name: values.visit_name,
        timepoint_label: labelTrimmed,
        timepoint_days: timepointDays,
        window_before_days: windowBefore,
        window_after_days: windowAfter,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Visit updated');
    } else {
      const { error } = await createStudyVisitDefinition(studyId, {
        visit_name: values.visit_name,
        timepoint_label: labelTrimmed,
        timepoint_days: timepointDays,
        window_before_days: windowBefore,
        window_after_days: windowAfter,
        sort_order: nextSortOrder ?? 0,
        version_id: versionId,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Visit added');
    }
    onOpenChange(false);
    onSuccess();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Visit' : 'Add Visit'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the visit definition.'
              : "Add a visit to this study's schedule."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Visit Name</Label>
            <Input
              placeholder="e.g., Screening Visit"
              className="text-xs"
              {...form.register('visit_name')}
            />
            {form.formState.errors.visit_name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.visit_name.message}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Timepoint Label</Label>
              <Input
                placeholder="Optional, e.g., Baseline"
                className="text-xs"
                {...form.register('timepoint_label')}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Timepoint (Days)</Label>
              <Input
                type="number"
                placeholder="Optional"
                className="text-xs"
                {...form.register('timepoint_days')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Window (relative to planned day)</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Days before
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder="0"
                  className="text-xs"
                  {...form.register('window_before_days')}
                />
                {form.formState.errors.window_before_days && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.window_before_days.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Days after
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder="0"
                  className="text-xs"
                  {...form.register('window_after_days')}
                />
                {form.formState.errors.window_after_days && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.window_after_days.message}
                  </p>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Allowed range around the planned visit date. Leave both at 0 for a
              single-day window.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? 'Saving...'
                : isEdit
                  ? 'Save Changes'
                  : 'Add Visit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── CRF Form Dialog ───────────────────────────────────────────────────────────

const crfSchema = z.object({
  name: z.string().min(1, 'CRF name is required'),
  description: z.string().optional(),
  visit_definition_id: z.string().min(1, 'Visit is required'),
});
type CrfFormValues = z.infer<typeof crfSchema>;

export function visitDisplayLabel(visit: StudyVisitDefinition): string {
  const parts: string[] = [];
  if (visit.timepoint_label) parts.push(visit.timepoint_label);
  if (typeof visit.timepoint_days === 'number') parts.push(`Day ${visit.timepoint_days}`);
  return parts.length > 0 ? `${visit.visit_name} - ${parts.join(' · ')}` : visit.visit_name;
}

export function CrfFormDialog({
  studyId,
  visits,
  crf,
  defaultVisitId,
  open,
  onOpenChange,
  onSuccess,
}: {
  studyId: string;
  visits: StudyVisitDefinition[];
  crf?: StudyCrf;
  defaultVisitId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const isEdit = !!crf;

  const defaults: CrfFormValues = isEdit
    ? {
        name: crf.name,
        description: crf.description ?? '',
        visit_definition_id: crf.visit_definition_id,
      }
    : {
        name: '',
        description: '',
        visit_definition_id: defaultVisitId ?? '',
      };

  const form = useForm<CrfFormValues>({
    resolver: zodResolver(crfSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (open) form.reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, crf?.id, defaultVisitId]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit) {
      const { error } = await updateStudyCrf(crf.id, studyId, {
        name: values.name,
        description: values.description ?? null,
        visit_definition_id: values.visit_definition_id,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('CRF updated');
    } else {
      const { error } = await createStudyCrf(studyId, {
        name: values.name,
        description: values.description ?? null,
        visit_definition_id: values.visit_definition_id,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('CRF created');
    }
    onOpenChange(false);
    onSuccess();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit CRF' : 'New CRF'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update CRF details. Change the Visit field to move this CRF and all of its questions to a different visit.'
              : 'Create a CRF on the selected visit. You can move it later by editing.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input
              placeholder="e.g., Vital Signs"
              className="text-xs"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Visit</Label>
            <Controller
              control={form.control}
              name="visit_definition_id"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue
                      placeholder="Select a visit"
                      getDisplayLabel={(v) => {
                        const vd = visits.find((x) => x.id === v);
                        return vd ? visitDisplayLabel(vd) : v;
                      }}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {visits.map((v) => (
                      <SelectItem key={v.id} value={v.id} className="text-xs">
                        {visitDisplayLabel(v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.visit_definition_id && (
              <p className="text-xs text-destructive">
                {form.formState.errors.visit_definition_id.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              placeholder="Optional"
              rows={2}
              className="text-xs"
              {...form.register('description')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? 'Saving...'
                : isEdit
                  ? 'Save Changes'
                  : 'Create CRF'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Question Form Dialog ──────────────────────────────────────────────────────

const SELECT_TYPES: QuestionType[] = ['single_select', 'multi_select'];

const questionSchema = z.object({
  label: z.string().min(1, 'Question label is required'),
  help_text: z.string().optional(),
  question_type: z.enum([
    'text',
    'textarea',
    'number',
    'date',
    'single_select',
    'multi_select',
    'yes_no',
  ]),
  required: z.boolean(),
  options: z.array(z.object({ value: z.string() })),
  crf_id: z.string().min(1, 'CRF is required'),
});
type QuestionFormValues = z.infer<typeof questionSchema>;

function questionDefaults(
  question: StudyCrfQuestion | undefined,
  defaultCrfId: string | undefined
): QuestionFormValues {
  return {
    label: question?.label ?? '',
    help_text: question?.help_text ?? '',
    question_type: (question?.question_type as QuestionType) ?? 'text',
    required: question?.required ?? false,
    options:
      question?.options && question.options.length > 0
        ? question.options.map((value) => ({ value }))
        : [{ value: '' }],
    crf_id: question?.crf_id ?? defaultCrfId ?? '',
  };
}

export interface CrfOption {
  id: string;
  name: string;
  visit_definition_id: string;
}

export function QuestionFormDialog({
  studyId,
  crfs,
  visits,
  question,
  defaultCrfId,
  nextSortOrder,
  open,
  onOpenChange,
  onSuccess,
}: {
  studyId: string;
  crfs: CrfOption[];
  visits: StudyVisitDefinition[];
  question?: StudyCrfQuestion;
  defaultCrfId?: string;
  nextSortOrder?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const isEdit = !!question;
  const originalCrfId = question?.crf_id ?? defaultCrfId ?? '';

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: questionDefaults(question, defaultCrfId),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'options',
  });

  const questionType = form.watch('question_type');
  const showOptions = SELECT_TYPES.includes(questionType);

  useEffect(() => {
    if (open) form.reset(questionDefaults(question, defaultCrfId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, question?.id, defaultCrfId]);

  useEffect(() => {
    if (!open) return;
    if (!SELECT_TYPES.includes(questionType)) {
      form.setValue('options', [{ value: '' }], { shouldDirty: false });
    } else if (form.getValues('options').length === 0) {
      form.setValue('options', [{ value: '' }], { shouldDirty: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionType, open]);

  const visitNameById = (id: string) => visits.find((v) => v.id === id)?.visit_name ?? null;

  const crfDisplayLabel = (c: CrfOption): string => {
    const visitName = visitNameById(c.visit_definition_id);
    return visitName ? `${c.name} - ${visitName}` : c.name;
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (!values.crf_id) return;
    const cleanedOptions = showOptions
      ? values.options.map((o) => o.value.trim()).filter((v) => v.length > 0)
      : null;
    if (showOptions && (!cleanedOptions || cleanedOptions.length === 0)) {
      toast.error('Add at least one option for select-type questions.');
      return;
    }

    if (isEdit) {
      const { error } = await updateCrfQuestion(
        question.id,
        studyId,
        originalCrfId,
        {
          label: values.label,
          help_text: values.help_text ?? null,
          question_type: values.question_type,
          required: values.required,
          options: cleanedOptions,
          crf_id: values.crf_id,
        }
      );
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Question updated');
    } else {
      const { error } = await createCrfQuestion(studyId, values.crf_id, {
        label: values.label,
        help_text: values.help_text ?? null,
        question_type: values.question_type,
        required: values.required,
        options: cleanedOptions,
        sort_order: nextSortOrder,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Question added');
    }
    onOpenChange(false);
    onSuccess();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Question' : 'Add Question'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this question. Change the CRF field to move it to another CRF.'
              : 'Define a question on the selected CRF.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">CRF</Label>
            <Controller
              control={form.control}
              name="crf_id"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue
                      placeholder="Select a CRF"
                      getDisplayLabel={(v) => {
                        const c = crfs.find((x) => x.id === v);
                        return c ? crfDisplayLabel(c) : v;
                      }}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {crfs.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {crfDisplayLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.crf_id && (
              <p className="text-xs text-destructive">
                {form.formState.errors.crf_id.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Question Label</Label>
            <Input
              placeholder="e.g., Systolic blood pressure (mmHg)"
              className="text-xs"
              {...form.register('label')}
            />
            {form.formState.errors.label && (
              <p className="text-xs text-destructive">{form.formState.errors.label.message}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Controller
                control={form.control}
                name="question_type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => field.onChange(val as QuestionType)}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue
                        placeholder="Select type"
                        getDisplayLabel={(v) =>
                          QUESTION_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Controller
                control={form.control}
                name="required"
                render={({ field }) => (
                  <Checkbox
                    id="question-required"
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                  />
                )}
              />
              <Label htmlFor="question-required" className="text-xs">
                Required
              </Label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Help Text</Label>
            <Textarea
              placeholder="Optional guidance shown to the data entry user"
              rows={2}
              className="text-xs"
              {...form.register('help_text')}
            />
          </div>

          {showOptions && (
            <div className="space-y-1.5">
              <Label className="text-xs">Options</Label>
              <div className="space-y-2">
                {fields.map((field, idx) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input
                      placeholder={`Option ${idx + 1}`}
                      className="text-xs"
                      {...form.register(`options.${idx}.value` as const)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => remove(idx)}
                      disabled={fields.length <= 1}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ value: '' })}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add option
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? 'Saving...'
                : isEdit
                  ? 'Save Changes'
                  : 'Add Question'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
