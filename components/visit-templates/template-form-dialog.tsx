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
import { createVisitTemplate, updateVisitTemplate } from '@/lib/actions/subject-visit-templates';
import { useToast } from '@/hooks/use-toast';
import type { ClinicalProtocol } from '@/lib/types/clinical-trials';
import type { SubjectVisitTemplateWithRelations } from '@/lib/types/clinical-trials';

const formSchema = z.object({
  protocol_id: z.string().min(1, 'Protocol is required'),
  version_number: z.string().min(1, 'Version number is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  protocols: ClinicalProtocol[];
  companyId: string;
  profileId: string;
  email: string;
  template?: SubjectVisitTemplateWithRelations | null;
}

export default function TemplateFormDialog({
  open,
  onOpenChange,
  onSuccess,
  protocols,
  companyId,
  profileId,
  email,
  template,
}: TemplateFormDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEditing = !!template;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      protocol_id: '',
      version_number: '1.0',
      name: '',
      description: '',
      is_active: false,
    },
  });

  useEffect(() => {
    if (template) {
      form.reset({
        protocol_id: template.protocol_id,
        version_number: template.version_number,
        name: template.name,
        description: template.description || '',
        is_active: template.is_active ?? false,
      });
    } else {
      form.reset({
        protocol_id: '',
        version_number: '1.0',
        name: '',
        description: '',
        is_active: false,
      });
    }
  }, [template, open, form]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);

    const result = isEditing
      ? await updateVisitTemplate(companyId, template!.id, {
          id: template!.id,
          name: data.name,
          description: data.description,
          version_number: data.version_number,
          is_active: data.is_active,
        })
      : await createVisitTemplate(companyId, profileId, email, data);

    if (result.success) {
      toast({
        title: 'Success',
        description: isEditing ? 'Template updated successfully' : 'Visit template created successfully',
      });
      form.reset();
      onOpenChange(false);
      onSuccess();
    } else {
      toast({
        title: 'Error',
        description: result.error || (isEditing ? 'Failed to update template' : 'Failed to create template'),
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
            {isEditing ? 'Edit Visit Template' : 'Create Visit Template'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing
              ? 'Update the template details below.'
              : 'Create a new visit template for a protocol. You can add visits and activities after creation.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="protocol_id"
              render={({ field }) => (
                <FormItem className="min-w-[250px]">
                  <FormLabel className="text-xs font-medium">Protocol</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger className="text-xs h-8 min-w-[250px]">
                        <SelectValue placeholder="Select protocol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="min-w-[250px]">
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
              name="version_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Version Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="1.0" className="text-xs h-8" />
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
                  <FormLabel className="text-xs font-medium">Template Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Standard Visit Schedule" className="text-xs h-8" />
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
                      placeholder="Describe the visit schedule..."
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
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-xs font-medium">Active Template</FormLabel>
                      <p className="text-[10px] text-muted-foreground">
                        Active templates are used for new subject enrollments
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

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
                {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Template' : 'Create Template')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
