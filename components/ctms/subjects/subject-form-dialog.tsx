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
}

export function SubjectFormDialog({
  studyId,
  sites,
  subject,
  onSuccess,
}: SubjectFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = !!subject;

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: isEdit
      ? {
          subject_number: subject.subject_number,
          site_id: subject.site_id,
          screening_number: subject.screening_number ?? '',
          randomization_number: subject.randomization_number ?? '',
          status: subject.status,
          screening_date: subject.screening_date ?? '',
          randomization_date: subject.randomization_date ?? '',
        }
      : {
          subject_number: '',
          site_id: '',
          screening_number: '',
          randomization_number: '',
          status: 'pre_screening',
          screening_date: '',
          randomization_date: '',
        },
  });

  const onSubmit = async (values: SubjectFormValues) => {
    if (isEdit) {
      const { error } = await updateSubject({
        id: subject.id,
        study_id: studyId,
        ...values,
        status: values.status as SubjectStatus,
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
    form.reset();
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEdit ? (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" />
          ) : (
            <Button size="sm" />
          )
        }
      >
        {isEdit ? (
          <Pencil className="h-3.5 w-3.5" />
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Enroll Subject
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Subject' : 'Enroll Subject'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update subject details and status.'
              : 'Enroll a new subject in this study.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Subject Number</Label>
              <Input
                placeholder="e.g., SUBJ-001"
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
              <Select
                value={form.watch('site_id')}
                onValueChange={(val) => form.setValue('site_id', val)}
              >
                <SelectTrigger className="w-full">
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
                    <SelectItem key={s.id} value={s.id}>
                      {s.site_number} — {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                {...form.register('screening_number')}
              />
            </div>
            <div className="space-y-2">
              <Label>Randomization Number</Label>
              <Input
                placeholder="Optional"
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
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder="Select Status"
                  getDisplayLabel={(v) => SUBJECT_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v}
                />
              </SelectTrigger>
              <SelectContent>
                {SUBJECT_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Screening Date</Label>
              <Input type="date" {...form.register('screening_date')} />
            </div>
            <div className="space-y-2">
              <Label>Randomization Date</Label>
              <Input type="date" {...form.register('randomization_date')} />
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
                  : 'Enroll Subject'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
