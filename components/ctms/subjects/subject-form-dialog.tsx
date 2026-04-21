'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
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

import type { Subject, SubjectStatus, StudySite } from '@/lib/types/ctms';
import { SUBJECT_STATUS_OPTIONS } from '@/lib/types/ctms';
import { createSubject, updateSubject } from '@/lib/actions/subjects';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CopilotFillTrigger } from '@/components/copilot/forms/copilot-fill-trigger';

const subjectSchema = z.object({
  subject_number: z.string().min(1, 'Subject number is required'),
  site_id: z.string().min(1, 'Please select a site'),
  screening_number: z.string().optional(),
  randomization_number: z.string().optional(),
  status: z.string().min(1),
  screening_date: z.string().optional(),
  randomization_date: z.string().optional(),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

interface SubjectFormDialogProps {
  studyId: string;
  sites: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
  subject?: Subject;
  onSuccess: () => void;
  /** When creating from a site-scoped view, pre-fill and optionally lock site */
  defaultSiteIdWhenCreate?: string;
  /** Hide site selector; site is fixed (uses subject site when editing, default when creating) */
  lockSiteSelection?: boolean;
  disabled?: boolean;
  disabledTooltip?: string;
}

export function SubjectFormDialog({
  studyId,
  sites,
  subject,
  onSuccess,
  defaultSiteIdWhenCreate,
  lockSiteSelection = false,
  disabled = false,
  disabledTooltip,
}: SubjectFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = !!subject;

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: isEdit
      ? {
          subject_number: subject.subject_number,
          site_id: subject.site_id ?? '',
          screening_number: subject.screening_number ?? '',
          randomization_number: subject.randomization_number ?? '',
          status: subject.status,
          screening_date: subject.screening_date ?? '',
          randomization_date: subject.randomization_date ?? '',
        }
      : {
          subject_number: '',
          site_id: defaultSiteIdWhenCreate ?? '',
          screening_number: '',
          randomization_number: '',
          status: 'pre_screening',
          screening_date: '',
          randomization_date: '',
        },
  });

  const resetFormForDialog = () => {
    if (subject) {
      form.reset({
        subject_number: subject.subject_number,
        site_id: subject.site_id ?? '',
        screening_number: subject.screening_number ?? '',
        randomization_number: subject.randomization_number ?? '',
        status: subject.status,
        screening_date: subject.screening_date ?? '',
        randomization_date: subject.randomization_date ?? '',
      });
    } else {
      const initialSite =
        lockSiteSelection && defaultSiteIdWhenCreate
          ? defaultSiteIdWhenCreate
          : (defaultSiteIdWhenCreate ?? '');
      form.reset({
        subject_number: '',
        site_id: initialSite,
        screening_number: '',
        randomization_number: '',
        status: 'pre_screening',
        screening_date: '',
        randomization_date: '',
      });
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (disabled && next) return;
    setOpen(next);
    if (next) {
      resetFormForDialog();
    }
  };

  const onSubmit = async (values: SubjectFormValues) => {
    if (isEdit) {
      const { error } = await updateSubject({
        id: subject.id,
        study_id: studyId,
        ...values,
        status: values.status as SubjectStatus,
        revalidateSiteId:
          typeof subject.site_id === 'string' ? subject.site_id : undefined,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Subject updated');
    } else {
      const { error } = await createSubject({
        study_id: studyId,
        ...values,
        status: values.status as SubjectStatus,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Subject enrolled');
    }

    setOpen(false);
    resetFormForDialog();
    onSuccess();
  };

  const lockedSiteId = lockSiteSelection
    ? (isEdit ? subject?.site_id : defaultSiteIdWhenCreate)
    : undefined;
  const lockedSite =
    typeof lockedSiteId === 'string'
      ? sites.find((s) => s.id === lockedSiteId)
      : undefined;
  const showSiteSelect = !lockSiteSelection;

  const trigger = (
    <DialogTrigger
      render={
        isEdit ? (
          <Button variant="outline" size="sm" disabled={disabled} />
        ) : (
          <Button size="sm" disabled={disabled} />
        )
      }
    >
      {isEdit ? (
        <>
          <Pencil className="mr-1 h-3.5 w-3.5" />
          Edit Subject
        </>
      ) : (
        <>
          <Plus className="mr-2 h-4 w-4" />
          Add Subject
        </>
      )}
    </DialogTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {disabled && disabledTooltip ? (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>{trigger}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs">
            {disabledTooltip}
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>{trigger}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs">
            {isEdit
              ? 'Edit this subject\u2019s number, site, status, and key dates (screening, randomization, completion, withdrawal).'
              : 'Enroll a new subject in this study and assign them to a site.'}
          </TooltipContent>
        </Tooltip>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update subject details and status.'
              : lockSiteSelection
                ? 'Enroll a new subject at this site.'
                : 'Enroll a new subject in this study.'}
          </DialogDescription>
        </DialogHeader>

        {!isEdit ? (
          <div className="flex justify-end pb-1">
            <CopilotFillTrigger
              schemaId="ctms.subject"
              schemaLabel="Subject"
              scope={{ kind: 'study', id: studyId }}
              studyId={studyId}
              currentValues={form.getValues() as Record<string, unknown>}
              onApplied={(values) => {
                for (const [path, value] of Object.entries(values)) {
                  if (path === 'site_id' && typeof value === 'string') {
                    const direct = sites.find(s => s.id === value);
                    const byNumber = direct
                      ? null
                      : sites.find(s => s.site_number.toLowerCase() === value.toLowerCase());
                    const byName = direct || byNumber
                      ? null
                      : sites.find(s => s.name.toLowerCase() === value.toLowerCase());
                    const resolved = direct?.id ?? byNumber?.id ?? byName?.id ?? null;
                    if (resolved) form.setValue('site_id', resolved, { shouldDirty: true, shouldValidate: true });
                    continue;
                  }
                  form.setValue(path as keyof SubjectFormValues, value as never, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                }
              }}
            />
          </div>
        ) : null}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Subject Number</Label>
              <Input
                placeholder="e.g., SUBJ-001"
                className="text-xs"
                {...form.register('subject_number')}
              />
              {form.formState.errors.subject_number && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.subject_number.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Site</Label>
              {showSiteSelect ? (
                <Select
                  value={form.watch('site_id')}
                  onValueChange={(val) => form.setValue('site_id', val)}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue
                      placeholder="Select Site"
                      getDisplayLabel={(v) => {
                        const site = sites.find((s) => s.id === v);
                        return site ? `${site.site_number} — ${site.name}` : v;
                      }}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {s.site_number} — {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div
                  className="flex min-h-9 w-full items-center rounded-md border border-input bg-muted/30 px-3 py-2 text-xs text-foreground"
                  aria-readonly="true"
                >
                  {lockedSite
                    ? `${lockedSite.site_number} — ${lockedSite.name}`
                    : '—'}
                </div>
              )}
              {form.formState.errors.site_id && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.site_id.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Screening Number</Label>
              <Input
                placeholder="Optional"
                className="text-xs"
                {...form.register('screening_number')}
              />
            </div>
            <div className="space-y-2">
              <Label>Randomization Number</Label>
              <Input
                placeholder="Optional"
                className="text-xs"
                {...form.register('randomization_number')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(val) => form.setValue('status', val)}
            >
              <SelectTrigger className="w-full text-xs">
                <SelectValue
                  placeholder="Select Status"
                  getDisplayLabel={(v) => SUBJECT_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v}
                />
              </SelectTrigger>
              <SelectContent>
                {SUBJECT_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Screening Date</Label>
              <Input type="date" className="text-xs" {...form.register('screening_date')} />
            </div>
            <div className="space-y-2">
              <Label>Randomization Date</Label>
              <Input type="date" className="text-xs" {...form.register('randomization_date')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? 'Saving...'
                : isEdit
                  ? 'Save Changes'
                  : 'Add Subject'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
