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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { createBudgetTemplate, updateBudgetTemplate } from '@/lib/actions/budget-templates';
import { useToast } from '@/hooks/use-toast';
import type { BudgetTemplateWithRelations, BudgetTemplateStatus } from '@/lib/types/budget-templates';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  protocol_id: z.string().optional(),
  is_default: z.boolean(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface BudgetTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  protocols: { id: string; protocol_number: string; title: string }[];
  companyId: string;
  template?: BudgetTemplateWithRelations | null;
}

export default function BudgetTemplateFormDialog({
  open,
  onOpenChange,
  onSuccess,
  protocols,
  companyId,
  template,
}: BudgetTemplateFormDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEditing = !!template;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      protocol_id: '',
      is_default: false,
      status: 'draft',
    },
  });

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        description: template.description || '',
        protocol_id: template.protocol_id || '',
        is_default: template.is_default,
        status: template.status,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        protocol_id: '',
        is_default: false,
        status: 'draft',
      });
    }
  }, [template, open, form]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);

    const result = isEditing
      ? await updateBudgetTemplate(template!.id, {
          name: data.name,
          description: data.description || null,
          is_default: data.is_default,
          status: data.status as BudgetTemplateStatus,
        })
      : await createBudgetTemplate(companyId, {
          name: data.name,
          description: data.description || null,
          protocol_id: data.protocol_id || null,
          is_default: data.is_default,
        });

    if (result.success) {
      toast({
        title: 'Success',
        description: isEditing ? 'Template updated.' : 'Budget template created.',
      });
      form.reset();
      onOpenChange(false);
      onSuccess();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Operation failed.',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xs font-semibold">
            {isEditing ? 'Edit Budget Template' : 'Create Budget Template'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing
              ? 'Update the template details below.'
              : 'Create a new budget template. You can add line items after creation.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Template Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., ONCO-001 Standard Site Budget" className="text-xs h-8" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="protocol_id"
              render={({ field }) => (
                <FormItem className="min-w-[250px]">
                  <FormLabel className="text-xs font-medium">Protocol (Optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger className="text-xs h-8 min-w-[250px]">
                        <SelectValue placeholder="No protocol (global template)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="min-w-[250px]">
                      <SelectItem value="" className="text-xs">No protocol (global template)</SelectItem>
                      {protocols.map((protocol) => (
                        <SelectItem key={protocol.id} value={protocol.id} className="text-xs">
                          {protocol.protocol_number} - {protocol.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEditing && (
                    <p className="text-[10px] text-muted-foreground">Protocol cannot be changed after creation</p>
                  )}
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe this budget template..."
                      className="text-xs min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {isEditing && (
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
                        <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                        <SelectItem value="active" className="text-xs">Active</SelectItem>
                        <SelectItem value="archived" className="text-xs">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="is_default"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-xs font-medium">Default Template</FormLabel>
                    <p className="text-[10px] text-muted-foreground">
                      Set as the default template for the selected protocol
                    </p>
                  </div>
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
                {loading
                  ? (isEditing ? 'Updating...' : 'Creating...')
                  : (isEditing ? 'Update Template' : 'Create Template')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
