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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { createVisitTemplate, updateVisitTemplate } from '@/lib/actions/visit-templates';
import type { SubjectVisitTemplateWithRelations } from '@/lib/types/clinical-trials';

const visitTemplateSchema = z.object({
  protocol_id: z.string().min(1, 'Protocol is required'),
  version_number: z.string().min(1, 'Version number is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  is_active: z.boolean(),
  irb_approval_date: z.string().optional(),
});

type VisitTemplateFormData = z.infer<typeof visitTemplateSchema>;

interface VisitTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  profileId: string;
  email: string;
  protocolId?: string;
  template?: SubjectVisitTemplateWithRelations | null;
  onSuccess: () => void;
}

export function VisitTemplateDialog({
  open,
  onOpenChange,
  companyId,
  profileId,
  email,
  protocolId,
  template,
  onSuccess,
}: VisitTemplateDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<VisitTemplateFormData>({
    resolver: zodResolver(visitTemplateSchema),
    defaultValues: {
      protocol_id: protocolId || '',
      version_number: '',
      name: '',
      description: '',
      is_active: true,
      irb_approval_date: '',
    },
  });

  useEffect(() => {
    if (template) {
      form.reset({
        protocol_id: template.protocol_id,
        version_number: template.version_number,
        name: template.name,
        description: template.description || '',
        is_active: template.is_active,
        irb_approval_date: template.irb_approval_date || '',
      });
    } else {
      form.reset({
        protocol_id: protocolId || '',
        version_number: '',
        name: '',
        description: '',
        is_active: true,
        irb_approval_date: '',
      });
    }
  }, [template, protocolId]);

  const onSubmit = async (data: VisitTemplateFormData) => {
    setIsSubmitting(true);

    try {
      let result;

      if (template) {
        result = await updateVisitTemplate(companyId, {
          id: template.id,
          name: data.name,
          description: data.description || null,
          is_active: data.is_active,
          irb_approval_date: data.irb_approval_date || null,
        });
      } else {
        result = await createVisitTemplate(companyId, profileId, email, {
          protocol_id: data.protocol_id,
          version_number: data.version_number,
          name: data.name,
          description: data.description || null,
          is_active: data.is_active,
          irb_approval_date: data.irb_approval_date || null,
        });
      }

      if (result.success) {
        toast({
          title: 'Success',
          description: template ? 'Visit template updated successfully' : 'Visit template created successfully',
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save visit template',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving visit template:', error);
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
            {template ? 'Edit Visit Template' : 'Create Visit Template'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Create a reusable visit schedule for subjects
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="version_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Version Number <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="1.0"
                        className="h-8 text-xs"
                        {...field}
                        disabled={!!template}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Standard Visit Schedule"
                        className="h-8 text-xs"
                        {...field}
                      />
                    </FormControl>
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
                  <FormLabel className="text-xs">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the visit schedule..."
                      className="min-h-[80px] text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="irb_approval_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">IRB Approval Date</FormLabel>
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
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-6">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-xs font-normal">
                      Active Template
                    </FormLabel>
                  </FormItem>
                )}
              />
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
                {isSubmitting ? 'Saving...' : template ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
