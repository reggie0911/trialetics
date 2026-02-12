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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { createAccountAssociation, updateAccountAssociation } from '@/lib/actions/account-associations';
import type { AccountType, EntityType, ProtocolAccountWithRelations, RegionAccountWithRelations, SiteAccountWithRelations } from '@/lib/types/clinical-trials';
import { ACCOUNT_TYPE_LABELS } from '@/lib/types/clinical-trials';

const accountAssociationSchema = z.object({
  organization_id: z.string().min(1, 'Organization is required'),
  account_type: z.string().min(1, 'Account type is required'),
  is_central: z.boolean().optional(),
  is_regional: z.boolean().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

type AccountAssociationFormData = z.infer<typeof accountAssociationSchema>;
type AccountAssociation = ProtocolAccountWithRelations | RegionAccountWithRelations | SiteAccountWithRelations;

interface AccountAssociationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  account?: AccountAssociation | null;
  organizations: Array<{ id: string; name: string; organization_type: string }>;
  onSuccess: () => void;
}

export function AccountAssociationDialog({
  open,
  onOpenChange,
  companyId,
  entityType,
  entityId,
  entityName,
  account,
  organizations,
  onSuccess,
}: AccountAssociationDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AccountAssociationFormData>({
    resolver: zodResolver(accountAssociationSchema),
    defaultValues: {
      organization_id: '',
      account_type: '',
      is_central: false,
      is_regional: false,
      start_date: '',
      end_date: '',
    },
  });

  useEffect(() => {
    if (account) {
      form.reset({
        organization_id: account.organization_id,
        account_type: account.account_type,
        is_central: 'is_central' in account ? account.is_central : false,
        is_regional: 'is_regional' in account ? account.is_regional : false,
        start_date: account.start_date || '',
        end_date: account.end_date || '',
      });
    } else {
      form.reset({
        organization_id: '',
        account_type: '',
        is_central: false,
        is_regional: false,
        start_date: '',
        end_date: '',
      });
    }
  }, [account]);

  const onSubmit = async (data: AccountAssociationFormData) => {
    setIsSubmitting(true);

    try {
      let result;

      if (account) {
        // Update existing association
        result = await updateAccountAssociation(companyId, {
          id: account.id,
          entity_type: entityType,
          is_central: data.is_central,
          is_regional: data.is_regional,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
        });
      } else {
        // Create new association
        result = await createAccountAssociation(companyId, {
          entity_type: entityType,
          entity_id: entityId,
          organization_id: data.organization_id,
          account_type: data.account_type as AccountType,
          is_central: data.is_central,
          is_regional: data.is_regional,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
        });
      }

      if (result.success) {
        toast({
          title: 'Success',
          description: account ? 'Account association updated successfully' : 'Account associated successfully',
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save account association',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving account association:', error);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {account ? 'Edit Account Association' : 'Associate Account'}
          </DialogTitle>
          {entityName && (
            <DialogDescription className="text-xs">
              {entityType.charAt(0).toUpperCase() + entityType.slice(1)}: {entityName}
            </DialogDescription>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="organization_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Organization <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!!account}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id} className="text-xs">
                            {org.name} ({org.organization_type})
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
                name="account_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Account Type <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!!account}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Start Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">End Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4">
              {entityType === 'protocol' && (
                <FormField
                  control={form.control}
                  name="is_central"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-xs font-normal">
                        Central Account
                      </FormLabel>
                    </FormItem>
                  )}
                />
              )}

              {entityType === 'region' && (
                <FormField
                  control={form.control}
                  name="is_regional"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-xs font-normal">
                        Regional Account
                      </FormLabel>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-8 text-xs">
                {isSubmitting ? 'Saving...' : account ? 'Update' : 'Associate'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
