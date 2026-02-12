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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { updateSitePsdvSettings, reapplySiteAutoSelectRate } from '@/lib/actions/psdv';
import { SDV_POLICY_LABELS, type SdvPolicy } from '@/lib/types/clinical-trials';
import type { ClinicalSiteWithRelations } from '@/lib/types/clinical-trials';

const sitePsdvSchema = z.object({
  sdv_policy: z.enum(['complete', 'partial', 'external']),
  psdv_initial_subjects_count: z.coerce.number().int().min(0).optional().nullable(),
  psdv_subject_auto_select_rate: z.coerce.number().min(0).max(100).optional().nullable(),
  use_cdms_auto_select_rule: z.boolean(),
});

type SitePsdvFormData = z.infer<typeof sitePsdvSchema>;

interface SitePsdvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: ClinicalSiteWithRelations | null;
  onSuccess: () => void;
}

export function SitePsdvDialog({
  open,
  onOpenChange,
  site,
  onSuccess,
}: SitePsdvDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReapplying, setIsReapplying] = useState(false);

  const form = useForm<SitePsdvFormData>({
    resolver: zodResolver(sitePsdvSchema),
    defaultValues: {
      sdv_policy: 'complete',
      psdv_initial_subjects_count: null,
      psdv_subject_auto_select_rate: null,
      use_cdms_auto_select_rule: false,
    },
  });

  const sdvPolicy = form.watch('sdv_policy');

  useEffect(() => {
    if (site) {
      form.reset({
        sdv_policy: (site.sdv_policy ?? 'complete') as SdvPolicy,
        psdv_initial_subjects_count: site.psdv_initial_subjects_count ?? null,
        psdv_subject_auto_select_rate: site.psdv_subject_auto_select_rate ?? null,
        use_cdms_auto_select_rule: site.use_cdms_auto_select_rule ?? false,
      });
    }
  }, [site, form]);

  const onSubmit = async (data: SitePsdvFormData) => {
    if (!site) return;
    setIsSubmitting(true);
    try {
      const result = await updateSitePsdvSettings(site.id, {
        sdv_policy: data.sdv_policy as SdvPolicy,
        psdv_initial_subjects_count: data.sdv_policy === 'partial' ? data.psdv_initial_subjects_count : undefined,
        psdv_subject_auto_select_rate: data.sdv_policy === 'partial' ? data.psdv_subject_auto_select_rate : undefined,
        use_cdms_auto_select_rule: data.use_cdms_auto_select_rule,
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

  const handleReapply = async () => {
    if (!site) return;
    setIsReapplying(true);
    try {
      const result = await reapplySiteAutoSelectRate(site.id);
      if (result.success) {
        toast({
          title: 'Success',
          description: `Total Subjects Requiring SDV updated to ${result.data?.total_subjects_requiring_sdv ?? 0}`,
        });
        onSuccess();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsReapplying(false);
    }
  };

  if (!site) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partial Source Data Verification</DialogTitle>
          <DialogDescription>
            SDV settings for Site {site.site_number || site.id.slice(0, 8)} ({site.protocol?.protocol_number})
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sdv_policy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">SDV Policy</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="text-[12px]">
                        <SelectValue placeholder="Select policy" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="complete" className="text-[12px]">
                        Complete
                      </SelectItem>
                      <SelectItem value="partial" className="text-[12px]">
                        Partial
                      </SelectItem>
                      <SelectItem value="external" className="text-[12px]">
                        External
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {sdvPolicy === 'partial' && (
              <>
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
              </>
            )}

            {sdvPolicy === 'external' && (
              <FormField
                control={form.control}
                name="use_cdms_auto_select_rule"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-xs font-normal">
                        Use CDMS Auto-Select Rule
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {sdvPolicy === 'partial' && (
              <div className="rounded-md border p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-2">
                  Total Subjects Requiring SDV: {site.total_subjects_requiring_sdv ?? '—'}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReapply}
                  disabled={isReapplying}
                  className="text-xs"
                >
                  {isReapplying ? 'Reapplying...' : 'Reapply Auto-Select Rate'}
                </Button>
              </div>
            )}

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
