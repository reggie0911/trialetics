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
import { updateTemplateVisitPsdv } from '@/lib/actions/psdv';

type TemplateVisitPsdvRow = {
  id: string;
  visit_name: string;
  visit_type: string;
  sequence: number;
  sdv_required: boolean;
  page_numbers_to_verify: string | null;
  template_id: string;
  template?: { name: string; version_number: string };
  protocol?: { protocol_number: string; title: string };
};

const templateVisitPsdvSchema = z.object({
  sdv_required: z.boolean(),
  page_numbers_to_verify: z.string().optional().nullable(),
});

type TemplateVisitPsdvFormData = z.infer<typeof templateVisitPsdvSchema>;

interface TemplateVisitPsdvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: TemplateVisitPsdvRow | null;
  companyId: string;
  onSuccess: () => void;
}

export function TemplateVisitPsdvDialog({
  open,
  onOpenChange,
  visit,
  companyId,
  onSuccess,
}: TemplateVisitPsdvDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TemplateVisitPsdvFormData>({
    resolver: zodResolver(templateVisitPsdvSchema),
    defaultValues: {
      sdv_required: false,
      page_numbers_to_verify: null,
    },
  });

  useEffect(() => {
    if (visit) {
      form.reset({
        sdv_required: visit.sdv_required,
        page_numbers_to_verify: visit.page_numbers_to_verify ?? null,
      });
    }
  }, [visit, form]);

  const onSubmit = async (data: TemplateVisitPsdvFormData) => {
    if (!visit) return;
    setIsSubmitting(true);
    try {
      const result = await updateTemplateVisitPsdv(companyId, visit.id, {
        sdv_required: data.sdv_required,
        page_numbers_to_verify: data.page_numbers_to_verify || null,
      });
      if (result.success) {
        toast({ title: 'Success', description: 'Template visit PSDV settings saved' });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visit) return null;

  const templateLabel = visit.template ? `${visit.template.name} v${visit.template.version_number}` : 'Template';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Visit PSDV Settings</DialogTitle>
          <DialogDescription>
            SDV settings for {visit.visit_name} ({templateLabel})
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sdv_required"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-xs font-normal">SDV Required</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="page_numbers_to_verify"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Page Numbers to Verify</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. 1-5, 8 or All Pages"
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
