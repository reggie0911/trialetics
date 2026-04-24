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
import { Textarea } from '@/components/ui/textarea';
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

import type { RegulatorySubmission, SubmissionType, SubmissionStatus } from '@/lib/types/ctms';
import { SUBMISSION_TYPE_OPTIONS, SUBMISSION_STATUS_OPTIONS } from '@/lib/types/ctms';
import { addSubmission, updateSubmission } from '@/lib/actions/countries';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const submissionSchema = z.object({
  submission_type: z.string().min(1, 'Please select a type'),
  status: z.string().min(1),
  submission_date: z.string().optional(),
  approval_date: z.string().optional(),
  expiry_date: z.string().optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

type SubmissionFormValues = z.infer<typeof submissionSchema>;

interface SubmissionFormDialogProps {
  studyId: string;
  studyCountryId: string;
  submission?: RegulatorySubmission;
  onSuccess: () => void;
  disabled?: boolean;
  disabledTooltip?: string;
  /** When provided, dialog is controlled and the internal trigger is not rendered. */
  controlledOpen?: boolean;
  onControlledOpenChange?: (next: boolean) => void;
}

export function SubmissionFormDialog({
  studyId,
  studyCountryId,
  submission,
  onSuccess,
  disabled = false,
  disabledTooltip,
  controlledOpen,
  onControlledOpenChange,
}: SubmissionFormDialogProps) {
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
  const isEdit = !!submission;

  const form = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: isEdit
      ? {
          submission_type: submission.submission_type,
          status: submission.status,
          submission_date: submission.submission_date ?? '',
          approval_date: submission.approval_date ?? '',
          expiry_date: submission.expiry_date ?? '',
          reference_number: submission.reference_number ?? '',
          notes: submission.notes ?? '',
        }
      : {
          submission_type: '',
          status: 'pending',
          submission_date: '',
          approval_date: '',
          expiry_date: '',
          reference_number: '',
          notes: '',
        },
  });

  const onSubmit = async (values: SubmissionFormValues) => {
    if (isEdit) {
      const { error } = await updateSubmission({
        id: submission.id,
        study_id: studyId,
        submission_type: values.submission_type as SubmissionType,
        status: values.status as SubmissionStatus,
        submission_date: values.submission_date || undefined,
        approval_date: values.approval_date || undefined,
        expiry_date: values.expiry_date || undefined,
        reference_number: values.reference_number || undefined,
        notes: values.notes || undefined,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Submission updated');
    } else {
      const { error } = await addSubmission({
        study_country_id: studyCountryId,
        study_id: studyId,
        submission_type: values.submission_type as SubmissionType,
        status: values.status as SubmissionStatus,
        submission_date: values.submission_date || undefined,
        approval_date: values.approval_date || undefined,
        expiry_date: values.expiry_date || undefined,
        reference_number: values.reference_number || undefined,
        notes: values.notes || undefined,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Submission added');
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
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={disabled} />
        ) : (
          <Button variant="outline" size="sm" disabled={disabled} />
        )
      }
    >
      {isEdit ? (
        <Pencil className="h-3 w-3" />
      ) : (
        <>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Submission
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Submission' : 'Add Regulatory Submission'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the details of this regulatory submission.'
              : 'Record a new regulatory submission for this country.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="submission_type">Submission Type</Label>
              <Select
                value={form.watch('submission_type')}
                onValueChange={(val) => form.setValue('submission_type', val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder="Select Type"
                    getDisplayLabel={(v) => SUBMISSION_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v}
                  />
                </SelectTrigger>
                <SelectContent>
                  {SUBMISSION_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.submission_type && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.submission_type.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(val) => form.setValue('status', val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder="Select Status"
                    getDisplayLabel={(v) => SUBMISSION_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v}
                  />
                </SelectTrigger>
                <SelectContent>
                  {SUBMISSION_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="submission_date">Submission Date</Label>
              <Input
                type="date"
                {...form.register('submission_date')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="approval_date">Approval Date</Label>
              <Input
                type="date"
                {...form.register('approval_date')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                type="date"
                {...form.register('expiry_date')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference_number">Reference Number</Label>
            <Input
              placeholder="e.g. IRB-2026-001"
              {...form.register('reference_number')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              placeholder="Additional notes about this submission..."
              rows={3}
              {...form.register('notes')}
            />
          </div>

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
                  : 'Add Submission'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
