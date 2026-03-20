'use client';

import { useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
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

import { createTemplate, updateTemplate } from '@/lib/actions/visit-reports';
import type { VisitReportTemplate } from '@/lib/types/visit-reports';
import { VISIT_REPORT_TYPE_OPTIONS, VISIT_REPORT_TYPE_LABELS } from '@/lib/types/visit-reports';

const schema = z.object({
  name: z.string().min(1, 'Template name is required'),
  study_id: z.string().optional(),
  visit_report_type: z.enum(['sqv', 'siv', 'monitoring', 'close_out']),
  days_submission: z.coerce.number().int().min(1, 'Must be at least 1'),
  days_approval: z.coerce.number().int().min(1, 'Must be at least 1'),
});

type FormValues = z.infer<typeof schema>;

const STUDY_NONE = '__none__';

interface StudyOption {
  id: string;
  title: string;
  protocol_number: string | null;
}

interface AddEditTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: VisitReportTemplate | null;
  studies: StudyOption[];
  onSuccess: () => void;
}

export function AddEditTemplateModal({
  open,
  onOpenChange,
  template,
  studies,
  onSuccess,
}: AddEditTemplateModalProps) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!template;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: template?.name ?? '',
      study_id: template?.study_id ?? STUDY_NONE,
      visit_report_type: (template?.visit_report_type as FormValues['visit_report_type']) ?? 'monitoring',
      days_submission: template?.days_submission ?? 14,
      days_approval: template?.days_approval ?? 7,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: template?.name ?? '',
        study_id: template?.study_id ?? STUDY_NONE,
        visit_report_type: (template?.visit_report_type as FormValues['visit_report_type']) ?? 'monitoring',
        days_submission: template?.days_submission ?? 14,
        days_approval: template?.days_approval ?? 7,
      });
    }
  }, [open, template, reset]);

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const studyId = values.study_id && values.study_id.trim() && values.study_id !== STUDY_NONE ? values.study_id : null;
      if (isEdit && template) {
        const { error, studySkipped } = await updateTemplate(template.id, {
          name: values.name,
          study_id: studyId,
          visit_report_type: values.visit_report_type,
          days_submission: values.days_submission,
          days_approval: values.days_approval,
        });
        if (error) {
          toast.error(error);
          return;
        }
        toast.success('Template updated.');
        if (studySkipped) {
          toast.info('Study association was not saved. Run the database migration to enable it.');
        }
      } else {
        const { data, error, studySkipped } = await createTemplate({
          name: values.name,
          study_id: studyId,
          visit_report_type: values.visit_report_type,
          days_submission: values.days_submission,
          days_approval: values.days_approval,
        });
        if (error) {
          toast.error(error);
          return;
        }
        toast.success('Template created.');
        if (studySkipped) {
          toast.info('Study association was not saved. Run the database migration to enable it.');
        }
      }
      reset();
      onOpenChange(false);
      onSuccess();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Visit Template' : 'Add Visit Template'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              {...register('name')}
              className="text-[12px]"
              placeholder="Enter title..."
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="study_id">Study</Label>
            <Select
              value={watch('study_id') ?? STUDY_NONE}
              onValueChange={(v) => setValue('study_id', v ?? STUDY_NONE)}
            >
              <SelectTrigger id="study_id" className="text-[12px]">
                <SelectValue
                  placeholder="Select a study (optional)"
                  getDisplayLabel={(v) => {
                    if (!v || v === STUDY_NONE) return 'None';
                    const s = studies.find((x) => x.id === v);
                    return s ? (s.protocol_number ? `${s.title} (${s.protocol_number})` : s.title) : v;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={STUDY_NONE}>None</SelectItem>
                {studies.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.protocol_number ? `${s.title} (${s.protocol_number})` : s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visit_report_type">Visit Report Type</Label>
            <Select
              value={watch('visit_report_type')}
              onValueChange={(v) => setValue('visit_report_type', v as FormValues['visit_report_type'])}
            >
              <SelectTrigger id="visit_report_type" className="text-[12px]">
                <SelectValue
                  placeholder="Choose an option..."
                  getDisplayLabel={(v) =>
                    v ? (VISIT_REPORT_TYPE_LABELS[v as keyof typeof VISIT_REPORT_TYPE_LABELS] ?? v) : null
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {VISIT_REPORT_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="days_submission">Amount of Days for Report Submission</Label>
            <Input
              id="days_submission"
              type="number"
              min={1}
              {...register('days_submission')}
              className="text-[12px]"
            />
            {errors.days_submission && (
              <p className="text-xs text-destructive">{errors.days_submission.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="days_approval">Amount of Days for Report Approval</Label>
            <Input
              id="days_approval"
              type="number"
              min={1}
              {...register('days_approval')}
              className="text-[12px]"
            />
            {errors.days_approval && (
              <p className="text-xs text-destructive">{errors.days_approval.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
