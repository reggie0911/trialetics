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
import { addBudgetTemplateItem, updateBudgetTemplateItem } from '@/lib/actions/budget-templates';
import { BUDGET_TEMPLATE_ITEM_CATEGORIES } from '@/lib/types/budget-templates';
import type { BudgetTemplateItem, BudgetTemplateItemCategory } from '@/lib/types/budget-templates';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  description: z.string().optional(),
  amount: z.coerce.number().min(0, 'Amount must be >= 0'),
  currency: z.string().min(1, 'Currency is required'),
  sort_order: z.coerce.number().int().min(0),
});

type FormData = z.infer<typeof formSchema>;

interface BudgetTemplateItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  templateId: string;
  item?: BudgetTemplateItem | null;
}

export default function BudgetTemplateItemFormDialog({
  open,
  onOpenChange,
  onSuccess,
  templateId,
  item,
}: BudgetTemplateItemFormDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEditing = !!item;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: '',
      subcategory: '',
      description: '',
      amount: 0,
      currency: 'USD',
      sort_order: 0,
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        category: item.category,
        subcategory: item.subcategory || '',
        description: item.description || '',
        amount: Number(item.amount),
        currency: item.currency,
        sort_order: item.sort_order,
      });
    } else {
      form.reset({
        category: '',
        subcategory: '',
        description: '',
        amount: 0,
        currency: 'USD',
        sort_order: 0,
      });
    }
  }, [item, open, form]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);

    const result = isEditing
      ? await updateBudgetTemplateItem(item!.id, {
          category: data.category as BudgetTemplateItemCategory,
          subcategory: data.subcategory || null,
          description: data.description || null,
          amount: data.amount,
          currency: data.currency,
          sort_order: data.sort_order,
        })
      : await addBudgetTemplateItem({
          template_id: templateId,
          category: data.category as BudgetTemplateItemCategory,
          subcategory: data.subcategory || null,
          description: data.description || null,
          amount: data.amount,
          currency: data.currency,
          sort_order: data.sort_order,
        });

    if (result.success) {
      toast({
        title: 'Success',
        description: isEditing ? 'Item updated.' : 'Item added.',
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
            {isEditing ? 'Edit Line Item' : 'Add Line Item'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing ? 'Update the line item details.' : 'Add a new budget line item to this template.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue
                          placeholder="Select category"
                          getDisplayLabel={(value) => {
                            const cat = BUDGET_TEMPLATE_ITEM_CATEGORIES.find((c) => c.value === value);
                            return cat ? cat.label : value;
                          }}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BUDGET_TEMPLATE_ITEM_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value} className="text-xs">
                          {cat.label}
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
              name="subcategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Subcategory (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., visit_fee, cycle_1" className="text-xs h-8" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Description (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Screening Visit - informed consent, eligibility" className="text-xs h-8" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Amount</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" className="text-xs h-8" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Currency</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="USD" className="text-xs h-8" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Sort Order</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" className="text-xs h-8" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

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
                  ? (isEditing ? 'Updating...' : 'Adding...')
                  : (isEditing ? 'Update Item' : 'Add Item')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
