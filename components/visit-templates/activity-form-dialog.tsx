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
import { createTemplateActivity, updateTemplateActivity } from '@/lib/actions/template-activities';
import { useToast } from '@/hooks/use-toast';
import type { TemplateActivity } from '@/lib/actions/template-activities';

const formSchema = z.object({
  activity_name: z.string().min(1, 'Activity name is required'),
  activity_type: z.string().min(1, 'Activity type is required'),
  is_required: z.boolean(),
  description: z.string().optional(),
  payment_flag: z.boolean(),
  payment_amount: z.union([z.number().min(0), z.null()]),
});

type FormData = z.infer<typeof formSchema>;

interface ActivityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  companyId: string;
  visitId: string;
  activity?: TemplateActivity | null;
}

const ACTIVITY_TYPES = [
  { value: 'Administrative', label: 'Administrative' },
  { value: 'Clinical', label: 'Clinical' },
  { value: 'Laboratory', label: 'Laboratory' },
  { value: 'Diagnostic', label: 'Diagnostic' },
  { value: 'Assessment', label: 'Assessment' },
  { value: 'Procedure', label: 'Procedure' },
  { value: 'Pharmacy', label: 'Pharmacy' },
  { value: 'Other', label: 'Other' },
];

export default function ActivityFormDialog({
  open,
  onOpenChange,
  onSuccess,
  companyId,
  visitId,
  activity,
}: ActivityFormDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEditing = !!activity;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      activity_name: '',
      activity_type: 'Clinical',
      is_required: true,
      description: '',
      payment_flag: false,
      payment_amount: null,
    },
  });

  useEffect(() => {
    if (activity) {
      form.reset({
        activity_name: activity.activity_name,
        activity_type: activity.activity_type,
        is_required: activity.is_required,
        description: activity.description || '',
        payment_flag: activity.payment_flag ?? false,
        payment_amount: activity.payment_amount ?? null,
      });
    } else {
      form.reset({
        activity_name: '',
        activity_type: 'Clinical',
        is_required: true,
        description: '',
        payment_flag: false,
        payment_amount: null,
      });
    }
  }, [activity, form]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    
    const result = isEditing
      ? await updateTemplateActivity(companyId, activity.id, data)
      : await createTemplateActivity(companyId, visitId, data);

    if (result.success) {
      toast({
        title: 'Success',
        description: `Activity ${isEditing ? 'updated' : 'created'} successfully`,
      });
      form.reset();
      onOpenChange(false);
      onSuccess();
    } else {
      toast({
        title: 'Error',
        description: result.error || `Failed to ${isEditing ? 'update' : 'create'} activity`,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xs font-semibold">
            {isEditing ? 'Edit Activity' : 'Add Activity'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing 
              ? 'Update the activity details below.' 
              : 'Add a new activity to this visit.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="activity_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Activity Name</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="e.g., Blood Draw, Vital Signs, ECG" 
                      className="text-xs h-8" 
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activity_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Activity Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue
                          placeholder="Select activity type"
                          getDisplayLabel={(value) => ACTIVITY_TYPES.find((t) => t.value === value)?.label ?? value}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ACTIVITY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="text-xs">
                          {type.label}
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
              name="is_required"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-xs font-medium">
                      Required Activity
                    </FormLabel>
                    <p className="text-[10px] text-muted-foreground">
                      This activity must be completed for the visit
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_flag"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-xs font-medium">
                      Payable Activity
                    </FormLabel>
                    <p className="text-[10px] text-muted-foreground">
                      This activity has a payment amount for sites
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_amount"
              render={({ field }) => (
                <FormItem className={form.watch('payment_flag') ? '' : 'hidden'}>
                  <FormLabel className="text-xs font-medium">Payment Amount (USD)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Optional description of this activity..."
                      className="text-xs min-h-[80px]"
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
                {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Activity' : 'Create Activity')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
