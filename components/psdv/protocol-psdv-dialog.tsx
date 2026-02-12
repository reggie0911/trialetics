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
import { useToast } from '@/hooks/use-toast';
import { updateProtocolPsdvSettings } from '@/lib/actions/psdv';
import type { ClinicalProtocolWithRelations } from '@/lib/types/clinical-trials';

const protocolPsdvSchema = z.object({
  psdv_initial_subjects_count: z.coerce.number().int().min(0).optional().nullable(),
  psdv_subject_auto_select_rate: z.coerce.number().min(0).max(100).optional().nullable(),
});

type ProtocolPsdvFormData = z.infer<typeof protocolPsdvSchema>;

interface ProtocolPsdvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocol: ClinicalProtocolWithRelations | null;
  onSuccess: () => void;
}

export function ProtocolPsdvDialog({
  open,
  onOpenChange,
  protocol,
  onSuccess,
}: ProtocolPsdvDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProtocolPsdvFormData>({
    resolver: zodResolver(protocolPsdvSchema),
    defaultValues: {
      psdv_initial_subjects_count: null,
      psdv_subject_auto_select_rate: null,
    },
  });

  useEffect(() => {
    if (protocol) {
      form.reset({
        psdv_initial_subjects_count: protocol.psdv_initial_subjects_count ?? null,
        psdv_subject_auto_select_rate: protocol.psdv_subject_auto_select_rate ?? null,
      });
    }
  }, [protocol, form]);

  const onSubmit = async (data: ProtocolPsdvFormData) => {
    if (!protocol) return;
    setIsSubmitting(true);
    try {
      const result = await updateProtocolPsdvSettings(protocol.id, {
        psdv_initial_subjects_count: data.psdv_initial_subjects_count ?? undefined,
        psdv_subject_auto_select_rate: data.psdv_subject_auto_select_rate ?? undefined,
      });
      if (result.success) {
        toast({ title: 'Success', description: 'PSDV settings saved' });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!protocol) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partial Source Data Verification</DialogTitle>
          <DialogDescription>
            PSDV settings for {protocol.protocol_number} — {protocol.title}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="psdv_initial_subjects_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Number of Initial Subjects</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="e.g. 5"
                      className="text-[12px]"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value === '' ? null : Number(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="psdv_subject_auto_select_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Subject Auto-Select Rate (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      placeholder="e.g. 25"
                      className="text-[12px]"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value === '' ? null : Number(e.target.value))
                      }
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
