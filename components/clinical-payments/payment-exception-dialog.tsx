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
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createPaymentException } from '@/lib/actions/clinical-payments';
import { getPaymentActivityTemplatesForProtocol } from '@/lib/actions/clinical-payments';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  template_activity_id: z.string().min(1, 'Select an activity'),
  template_visit_id: z.string().min(1, 'Visit is required'),
  exception_amount: z.coerce.number().min(0, 'Amount must be positive'),
  currency_code: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PaymentExceptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  siteId: string;
  companyId: string;
  protocolId: string;
}

export function PaymentExceptionDialog({
  open,
  onOpenChange,
  onSuccess,
  siteId,
  companyId,
  protocolId,
}: PaymentExceptionDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<
    Array<{
      id: string;
      activity_name: string;
      template_visit_id: string;
      visit_name: string;
      payment_amount: number | null;
    }>
  >([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      template_activity_id: '',
      template_visit_id: '',
      exception_amount: 0,
      currency_code: 'USD',
    },
  });

  useEffect(() => {
    if (open && protocolId) {
      getPaymentActivityTemplatesForProtocol(companyId, protocolId).then((res) => {
        if (res.success && res.data) {
          setOptions(res.data);
        }
      });
    }
  }, [open, protocolId, companyId]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const result = await createPaymentException(companyId, siteId, {
      ...data,
      protocol_id: protocolId,
    });

    if (result.success) {
      toast({
        title: 'Success',
        description: 'Payment exception created',
      });
      form.reset();
      onSuccess();
      onOpenChange(false);
    } else {
      toast({
        title: 'Error',
        description: result.error ?? 'Failed to create exception',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xs font-semibold">Add Payment Exception</DialogTitle>
          <DialogDescription className="text-xs">
            Set a site-specific payment amount override for a template activity.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="template_activity_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Activity</FormLabel>
                  <Select
                    onValueChange={(v) => {
                      field.onChange(v);
                      const opt = options.find((o) => o.id === v);
                      if (opt) {
                        form.setValue('template_visit_id', opt.template_visit_id);
                        form.setValue('exception_amount', opt.payment_amount ?? 0);
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue placeholder="Select activity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {options.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id} className="text-xs">
                          {opt.activity_name} ({opt.visit_name}) - Standard: $
                          {opt.payment_amount ?? 0}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="exception_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Exception Amount</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min={0}
                      className="text-xs h-8"
                      placeholder="0.00"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="text-xs h-8">
                {loading ? 'Creating...' : 'Create Exception'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
