'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { updateSubjectSdvRequired } from '@/lib/actions/psdv';
import { SDV_LAST_UPDATED_SOURCE_LABELS } from '@/lib/types/clinical-trials';
import type { SubjectWithRelations } from '@/lib/types/clinical-trials';
import type { SdvLastUpdatedSource } from '@/lib/types/clinical-trials';

const subjectSdvSchema = z.object({
  sdv_required: z.boolean(),
  sdv_last_updated_source: z.enum(['manual', 'site', 'subject_status', 'external']),
});

type SubjectSdvFormData = z.infer<typeof subjectSdvSchema>;

interface SubjectSdvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: SubjectWithRelations | null;
  onSuccess: () => void;
}

export function SubjectSdvDialog({
  open,
  onOpenChange,
  subject,
  onSuccess,
}: SubjectSdvDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SubjectSdvFormData>({
    resolver: zodResolver(subjectSdvSchema),
    defaultValues: {
      sdv_required: false,
      sdv_last_updated_source: 'manual',
    },
  });

  useEffect(() => {
    if (subject) {
      form.reset({
        sdv_required: subject.sdv_required ?? false,
        sdv_last_updated_source: (subject.sdv_last_updated_source ?? 'manual') as SdvLastUpdatedSource,
      });
    }
  }, [subject, form]);

  const onSubmit = async (data: SubjectSdvFormData) => {
    if (!subject) return;
    setIsSubmitting(true);
    try {
      const result = await updateSubjectSdvRequired(
        subject.id,
        data.sdv_required,
        data.sdv_last_updated_source as SdvLastUpdatedSource
      );
      if (result.success) {
        toast({ title: 'Success', description: 'Subject SDV settings saved' });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!subject) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subject SDV Settings</DialogTitle>
          <DialogDescription>
            SDV settings for Subject {subject.subject_number || subject.screening_number || subject.id.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sdv_required"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">SDV Required</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === 'true')}
                    value={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger className="text-[12px]">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true" className="text-[12px]">
                        Yes
                      </SelectItem>
                      <SelectItem value="false" className="text-[12px]">
                        No
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sdv_last_updated_source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Last Updated Source</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="text-[12px]">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(SDV_LAST_UPDATED_SOURCE_LABELS) as SdvLastUpdatedSource[]).map((key) => (
                        <SelectItem key={key} value={key} className="text-[12px]">
                          {SDV_LAST_UPDATED_SOURCE_LABELS[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="text-xs">
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
