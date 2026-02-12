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
import { updatePaymentRecord } from '@/lib/actions/clinical-payments';
import { useToast } from '@/hooks/use-toast';
import { PAYMENT_STATUS_LABELS } from '@/lib/types/clinical-payments';
import type { PaymentStatus } from '@/lib/types/clinical-payments';

const formSchema = z.object({
  status: z.enum(['to_be_processed', 'in_progress', 'processed']),
  check_amount: z.union([z.number().min(0), z.null()]),
  check_date: z.string().nullable(),
  check_number: z.string().nullable(),
  vat_amount: z.union([z.number().min(0), z.null()]),
});

type FormData = z.infer<typeof formSchema>;

interface PaymentRecordWithRelations {
  id: string;
  payment_number: string | null;
  status: string;
  earned_amount: number;
  requested_amount?: number;
  check_amount: number | null;
  check_date: string | null;
  check_number: string | null;
  vat_amount: number;
}

interface PaymentRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  record: PaymentRecordWithRelations | null;
}

export function PaymentRecordDialog({
  open,
  onOpenChange,
  onSuccess,
  record,
}: PaymentRecordDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: 'to_be_processed',
      check_amount: null,
      check_date: null,
      check_number: null,
      vat_amount: null,
    },
  });

  useEffect(() => {
    if (record) {
      form.reset({
        status: record.status as PaymentStatus,
        check_amount: record.check_amount ?? null,
        check_date: record.check_date ? record.check_date.slice(0, 10) : null,
        check_number: record.check_number ?? null,
        vat_amount: record.vat_amount ?? null,
      });
    }
  }, [record, form]);

  const onSubmit = async (data: FormData) => {
    if (!record) return;
    setLoading(true);
    const result = await updatePaymentRecord(record.id, {
      status: data.status as PaymentStatus,
      check_amount: data.check_amount,
      check_date: data.check_date || null,
      check_number: data.check_number || null,
      vat_amount: data.vat_amount ?? 0,
    });

    if (result.success) {
      toast({
        title: 'Success',
        description: 'Payment record updated',
      });
      onSuccess();
      onOpenChange(false);
    } else {
      toast({
        title: 'Error',
        description: result.error ?? 'Failed to update',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xs font-semibold">
            Edit Payment Record - {record.payment_number}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Update check details and status. Earned: {record.earned_amount.toFixed(2)};
            Requested: {record.requested_amount != null ? `$${record.requested_amount.toFixed(2)}` : '-'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">
                          {v}
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
              name="check_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Check Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="0.00"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '') field.onChange(null);
                        else {
                          const n = parseFloat(v);
                          if (!isNaN(n)) field.onChange(n);
                        }
                      }}
                      className="text-xs h-8"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="check_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Check Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className="text-xs h-8"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="check_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Check Number</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      placeholder="Check number"
                      className="text-xs h-8"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vat_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">VAT Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="0.00"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '') field.onChange(null);
                        else {
                          const n = parseFloat(v);
                          if (!isNaN(n)) field.onChange(n);
                        }
                      }}
                      className="text-xs h-8"
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
                {loading ? 'Updating...' : 'Update Record'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
