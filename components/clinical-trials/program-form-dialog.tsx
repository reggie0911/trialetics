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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createClinicalProgram, updateClinicalProgram } from '@/lib/actions/clinical-programs';
import { PROTOCOL_STATUS_LABELS } from '@/lib/types/clinical-trials';
import type { ClinicalProgramWithRelations, ProtocolStatus } from '@/lib/types/clinical-trials';

const programSchema = z.object({
  name: z.string().min(1, 'Program name is required'),
  mechanism: z.string().optional(),
  application_id: z.string().optional(),
  status: z.enum(['planned', 'in_progress', 'on_hold', 'completed', 'terminated']),
  description: z.string().optional(),
});

type ProgramFormData = z.infer<typeof programSchema>;

interface ProgramFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  profileId: string;
  email: string;
  program?: ClinicalProgramWithRelations | null;
  onSuccess: () => void;
}

export function ProgramFormDialog({
  open,
  onOpenChange,
  companyId,
  profileId,
  email,
  program,
  onSuccess,
}: ProgramFormDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProgramFormData>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      name: '',
      mechanism: '',
      application_id: '',
      status: 'planned',
      description: '',
    },
  });

  useEffect(() => {
    if (program) {
      form.reset({
        name: program.name,
        mechanism: program.mechanism || '',
        application_id: program.application_id || '',
        status: program.status,
        description: program.description || '',
      });
    } else {
      form.reset({
        name: '',
        mechanism: '',
        application_id: '',
        status: 'planned',
        description: '',
      });
    }
  }, [program]); // Removed form from dependencies - form.reset is stable

  const onSubmit = async (data: ProgramFormData) => {
    setIsSubmitting(true);

    try {
      const result = program
        ? await updateClinicalProgram({ id: program.id, ...data })
        : await createClinicalProgram(companyId, profileId, email, data);

      if (result.success) {
        toast({
          title: 'Success',
          description: `Program ${program ? 'updated' : 'created'} successfully`,
        });
        onSuccess();
      } else {
        toast({
          title: 'Error',
          description: result.error || `Failed to ${program ? 'update' : 'create'} program`,
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{program ? 'Edit Program' : 'Create Program'}</DialogTitle>
          <DialogDescription>
            {program
              ? 'Update the clinical program information'
              : 'Create a new clinical program'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    Program Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} className="h-8 text-xs" placeholder="Enter program name" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="mechanism"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Mechanism</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-8 text-xs" placeholder="Enter mechanism" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="application_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Application ID</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-8 text-xs" placeholder="Enter application ID" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Status <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue 
                            placeholder="Select status"
                            getDisplayLabel={(value) => value ? PROTOCOL_STATUS_LABELS[value as keyof typeof PROTOCOL_STATUS_LABELS] : null}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PROTOCOL_STATUS_LABELS).map(([value, label]) => (
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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="min-h-[100px] text-xs"
                      placeholder="Enter program description"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
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
                {isSubmitting ? 'Saving...' : program ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
