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
import { createPaymentActivity } from '@/lib/actions/clinical-payments';
import { getContractsForClinicalSite, getPayeeContactsForSite } from '@/lib/actions/clinical-payments';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  standard_amount: z.coerce.number().min(0, 'Amount must be positive'),
  contract_id: z.string().optional(),
  payee_contact_id: z.string().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface UnplannedPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  siteId: string;
  companyId: string;
}

export function UnplannedPaymentDialog({
  open,
  onOpenChange,
  onSuccess,
  siteId,
  companyId,
}: UnplannedPaymentDialogProps) {
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Array<{ id: string; contract_number: string | null; contract_type: string }>>([]);
  const [contacts, setContacts] = useState<Array<{ id: string; first_name: string | null; last_name: string | null }>>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      standard_amount: 0,
      contract_id: '',
      payee_contact_id: '',
      description: '',
    },
  });

  useEffect(() => {
    if (open) {
      Promise.all([
        getContractsForClinicalSite(siteId),
        getPayeeContactsForSite(companyId, siteId),
      ]).then(([cRes, pRes]) => {
        if (cRes.success && cRes.data) setContracts(cRes.data);
        if (pRes.success && pRes.data) setContacts(pRes.data);
      });
    }
  }, [open, siteId, companyId]);

  const onSubmit = async (data: FormData) => {
    const result = await createPaymentActivity(companyId, siteId, {
      standard_amount: data.standard_amount,
      contract_id: data.contract_id || null,
      payee_contact_id: data.payee_contact_id || null,
      is_unplanned: true,
    });

    if (result.success) {
      toast({
        title: 'Success',
        description: 'Unplanned payment activity created',
      });
      form.reset();
      onSuccess();
      onOpenChange(false);
    } else {
      toast({
        title: 'Error',
        description: result.error ?? 'Failed to create',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xs font-semibold">Add Unplanned Payment</DialogTitle>
          <DialogDescription className="text-xs">
            Create a payment activity not associated with subject activities (e.g. IRB fees, equipment costs).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="standard_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Amount</FormLabel>
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

            <FormField
              control={form.control}
              name="contract_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Contract</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue placeholder="Select contract (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="" className="text-xs">-</SelectItem>
                      {contracts.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.contract_number ?? c.contract_type}-{c.id.slice(0, 8)}
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
              name="payee_contact_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Payee</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue placeholder="Select payee (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="" className="text-xs">-</SelectItem>
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button type="submit" className="text-xs h-8">
                Create Activity
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
