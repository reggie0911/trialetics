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
  FormDescription,
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
import { createTemplateVisit, updateTemplateVisit } from '@/lib/actions/template-visits';
import { useToast } from '@/hooks/use-toast';
import type { TemplateVisit } from '@/lib/actions/template-visits';

const formSchema = z.object({
  visit_name: z.string().min(1, 'Visit name is required'),
  visit_type: z.string().min(1, 'Visit type is required'),
  day_from_baseline: z.coerce.number().min(0, 'Day from baseline must be 0 or greater'),
  visit_window_before: z.coerce.number().nullable().optional(),
  visit_window_after: z.coerce.number().nullable().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface VisitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  companyId: string;
  templateId: string;
  visit?: TemplateVisit | null;
}

const VISIT_TYPES = [
  { value: 'screening', label: 'Screening' },
  { value: 'rescreening', label: 'Rescreening' },
  { value: 'enrollment', label: 'Enrollment' },
  { value: 'baseline', label: 'Baseline' },
  { value: 'treatment', label: 'Treatment' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'early_termination', label: 'Early Termination' },
  { value: 'end_of_study', label: 'End of Study' },
  { value: 'unscheduled', label: 'Unscheduled' },
];

export default function VisitFormDialog({
  open,
  onOpenChange,
  onSuccess,
  companyId,
  templateId,
  visit,
}: VisitFormDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEditing = !!visit;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      visit_name: '',
      visit_type: 'screening',
      day_from_baseline: 0,
      visit_window_before: null,
      visit_window_after: null,
      description: '',
    },
  });

  useEffect(() => {
    if (visit) {
      form.reset({
        visit_name: visit.visit_name,
        visit_type: visit.visit_type,
        day_from_baseline: visit.day_from_baseline,
        visit_window_before: visit.visit_window_before,
        visit_window_after: visit.visit_window_after,
        description: visit.description || '',
      });
    } else {
      form.reset({
        visit_name: '',
        visit_type: 'screening',
        day_from_baseline: 0,
        visit_window_before: null,
        visit_window_after: null,
        description: '',
      });
    }
  }, [visit, form]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    
    const result = isEditing
      ? await updateTemplateVisit(companyId, visit.id, data)
      : await createTemplateVisit(companyId, templateId, data);

    if (result.success) {
      toast({
        title: 'Success',
        description: `Visit ${isEditing ? 'updated' : 'created'} successfully`,
      });
      form.reset();
      onOpenChange(false);
      onSuccess();
    } else {
      toast({
        title: 'Error',
        description: result.error || `Failed to ${isEditing ? 'update' : 'create'} visit`,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xs font-semibold">
            {isEditing ? 'Edit Visit' : 'Add Visit'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing 
              ? 'Update the visit details below.' 
              : 'Add a new visit to this template. You can add activities after creating the visit.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="visit_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Visit Name</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="e.g., Screening Visit, Week 4 Treatment" 
                      className="text-xs h-8" 
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visit_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Visit Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue
                          placeholder="Select visit type"
                          getDisplayLabel={(value) => VISIT_TYPES.find((t) => t.value === value)?.label ?? value}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {VISIT_TYPES.map((type) => (
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

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="day_from_baseline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Day from Baseline</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="0"
                        placeholder="0" 
                        className="text-xs h-8" 
                      />
                    </FormControl>
                    <FormDescription className="text-[10px]">
                      Days since baseline
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visit_window_before"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Window Before</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="0"
                        placeholder="Optional"
                        value={field.value ?? ''}
                        className="text-xs h-8" 
                      />
                    </FormControl>
                    <FormDescription className="text-[10px]">
                      Days before
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visit_window_after"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Window After</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="0"
                        placeholder="Optional"
                        value={field.value ?? ''}
                        className="text-xs h-8" 
                      />
                    </FormControl>
                    <FormDescription className="text-[10px]">
                      Days after
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Optional description of this visit..."
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
                {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Visit' : 'Create Visit')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
