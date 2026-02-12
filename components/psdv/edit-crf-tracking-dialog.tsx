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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { updateCrfTracking } from '@/lib/actions/psdv';
import type { CrfTrackingWithRelations } from '@/lib/types/clinical-trials';

const editCrfSchema = z.object({
  source_verified: z.boolean(),
  retrieved: z.boolean(),
  page_numbers_verified: z.string().optional().nullable(),
  charts_reviewed_date: z.string().optional().nullable(),
  forms_signed_date: z.string().optional().nullable(),
});

type EditCrfFormData = z.infer<typeof editCrfSchema>;

interface EditCrfTrackingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CrfTrackingWithRelations | null;
  onSuccess: () => void;
}

export function EditCrfTrackingDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: EditCrfTrackingDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditCrfFormData>({
    resolver: zodResolver(editCrfSchema),
    defaultValues: {
      source_verified: false,
      retrieved: false,
      page_numbers_verified: null,
      charts_reviewed_date: null,
      forms_signed_date: null,
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        source_verified: item.source_verified ?? false,
        retrieved: item.retrieved ?? false,
        page_numbers_verified: item.page_numbers_verified ?? null,
        charts_reviewed_date: item.charts_reviewed_date ? item.charts_reviewed_date.slice(0, 10) : null,
        forms_signed_date: item.forms_signed_date ? item.forms_signed_date.slice(0, 10) : null,
      });
    }
  }, [item, form]);

  const onSubmit = async (data: EditCrfFormData) => {
    if (!item) return;
    setIsSubmitting(true);
    try {
      const result = await updateCrfTracking({
        id: item.id,
        source_verified: data.source_verified,
        retrieved: data.retrieved,
        page_numbers_verified: data.page_numbers_verified || null,
        charts_reviewed_date: data.charts_reviewed_date ? `${data.charts_reviewed_date}T00:00:00Z` : null,
        forms_signed_date: data.forms_signed_date ? `${data.forms_signed_date}T00:00:00Z` : null,
      });
      if (result.success) {
        toast({ title: 'Success', description: 'CRF tracking updated' });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit CRF Tracking</DialogTitle>
          <DialogDescription>
            {item.site_visit?.visit_name} — {item.subject_visit?.visit_name}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="source_verified"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-xs font-normal">Source Verified</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="retrieved"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-xs font-normal">Retrieved</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="page_numbers_verified"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Page Numbers Verified</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. 1-5, 8"
                      className="text-[12px]"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="charts_reviewed_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Charts Reviewed Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="text-[12px]"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="forms_signed_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Forms Signed Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="text-[12px]"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
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
