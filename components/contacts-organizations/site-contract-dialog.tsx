'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createSiteContract, updateSiteContract } from '@/lib/actions/site-contracts';
import {
  SITE_CONTRACT_TYPE_LABELS,
  SITE_CONTRACT_STATUS_LABELS,
  type SiteContractType,
  type SiteContractStatus,
  type SiteContract,
} from '@/lib/types/contacts-organizations';

const siteContractSchema = z.object({
  contract_type: z.enum(['clinical_trial', 'feasibility', 'site_budget', 'master_service', 'other']),
  contract_amount: z.string().optional(),
  currency_code: z.string().optional(),
  payee_contact_id: z.string().optional(),
  protocol_id: z.string().optional(),
  status: z.enum(['draft', 'pending', 'executed', 'terminated', 'expired']),
  effective_date: z.string().optional(),
  expiry_date: z.string().optional(),
  notes: z.string().optional(),
});

type SiteContractFormValues = z.infer<typeof siteContractSchema>;

interface SiteContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  organizationId: string;
  contract?: SiteContract | null;
  protocols?: Array<{ id: string; protocol_number: string; protocol_name: string }>;
  contacts?: Array<{ id: string; first_name: string | null; last_name: string | null }>;
}

export function SiteContractDialog({
  open,
  onOpenChange,
  onSuccess,
  organizationId,
  contract,
  protocols = [],
  contacts = [],
}: SiteContractDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!contract;

  const { register, handleSubmit, reset, setValue, watch } = useForm<SiteContractFormValues>({
    resolver: zodResolver(siteContractSchema),
    defaultValues: {
      contract_type: 'clinical_trial',
      contract_amount: '',
      currency_code: 'USD',
      payee_contact_id: '',
      protocol_id: '',
      status: 'draft',
      effective_date: '',
      expiry_date: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (contract) {
        reset({
          contract_type: contract.contract_type,
          contract_amount: contract.contract_amount != null ? String(contract.contract_amount) : '',
          currency_code: contract.currency_code || 'USD',
          payee_contact_id: contract.payee_contact_id || '',
          protocol_id: contract.protocol_id || '',
          status: contract.status,
          effective_date: contract.effective_date || '',
          expiry_date: contract.expiry_date || '',
          notes: contract.notes || '',
        });
      } else {
        reset({
          contract_type: 'clinical_trial',
          contract_amount: '',
          currency_code: 'USD',
          payee_contact_id: '',
          protocol_id: '',
          status: 'draft',
          effective_date: '',
          expiry_date: '',
          notes: '',
        });
      }
    }
  }, [open, contract, reset]);

  const onSubmit = async (values: SiteContractFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        contract_type: values.contract_type as SiteContractType,
        contract_amount: values.contract_amount ? parseFloat(values.contract_amount) : null,
        currency_code: values.currency_code || 'USD',
        payee_contact_id: values.payee_contact_id || null,
        protocol_id: values.protocol_id || null,
        status: values.status as SiteContractStatus,
        effective_date: values.effective_date || null,
        expiry_date: values.expiry_date || null,
        notes: values.notes || null,
      };

      const result = isEditing
        ? await updateSiteContract(contract.id, payload)
        : await createSiteContract(organizationId, payload);

      if (result.success) {
        toast({
          title: isEditing ? 'Contract updated' : 'Contract created',
          description: `Contract has been ${isEditing ? 'updated' : 'created'} successfully.`,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || `Failed to ${isEditing ? 'update' : 'create'} contract`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {isEditing ? 'Edit Contract' : 'New Contract'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing
              ? 'Update the contract details.'
              : 'Add a contract associated with this site (amount, type, payee).'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="contract_type" className="text-xs">Contract Type *</Label>
              <Select
                value={watch('contract_type')}
                onValueChange={(v) => v && setValue('contract_type', v as SiteContractType)}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue getDisplayLabel={(v) => (v ? SITE_CONTRACT_TYPE_LABELS[v as SiteContractType] : null)} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SITE_CONTRACT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="status" className="text-xs">Status</Label>
              <Select
                value={watch('status')}
                onValueChange={(v) => v && setValue('status', v as SiteContractStatus)}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue getDisplayLabel={(v) => (v ? SITE_CONTRACT_STATUS_LABELS[v as SiteContractStatus] : null)} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SITE_CONTRACT_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="contract_amount" className="text-xs">Amount</Label>
              <Input
                id="contract_amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="text-xs h-8"
                {...register('contract_amount')}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="currency_code" className="text-xs">Currency</Label>
              <Input
                id="currency_code"
                placeholder="USD"
                className="text-xs h-8"
                {...register('currency_code')}
              />
            </div>
          </div>

          {contacts.length > 0 && (
            <div className="space-y-1">
              <Label htmlFor="payee_contact_id" className="text-xs">Payee</Label>
              <Select
                value={watch('payee_contact_id') || ''}
                onValueChange={(v) => setValue('payee_contact_id', v || '')}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="Select payee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">None</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {protocols.length > 0 && (
            <div className="space-y-1">
              <Label htmlFor="protocol_id" className="text-xs">Protocol</Label>
              <Select
                value={watch('protocol_id') || ''}
                onValueChange={(v) => setValue('protocol_id', v || '')}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="Select protocol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">None</SelectItem>
                  {protocols.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.protocol_number} - {p.protocol_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="effective_date" className="text-xs">Effective Date</Label>
              <Input
                id="effective_date"
                type="date"
                className="text-xs h-8"
                {...register('effective_date')}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="expiry_date" className="text-xs">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="date"
                className="text-xs h-8"
                {...register('expiry_date')}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              className="text-xs resize-none"
              rows={2}
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="text-xs">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Update' : 'Create Contract'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
