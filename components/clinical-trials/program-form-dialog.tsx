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
  FormDescription,
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
import { getAllContacts } from '@/lib/actions/contacts';
import { PROTOCOL_STATUS_LABELS } from '@/lib/types/clinical-trials';
import type { ClinicalProgramWithRelations, ProtocolStatus } from '@/lib/types/clinical-trials';
import type { Contact } from '@/lib/types/contacts-organizations';

const programSchema = z.object({
  name: z.string().min(1, 'Program name is required'),
  mechanism: z.string().optional(),
  application_id: z.string().optional(),
  status: z.enum(['planned', 'in_progress', 'on_hold', 'completed', 'terminated']),
  description: z.string().optional(),
  program_manager_contact_id: z.string().optional(),
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
  const [contacts, setContacts] = useState<Contact[]>([]);

  const form = useForm<ProgramFormData>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      name: '',
      mechanism: '',
      application_id: '',
      status: 'planned',
      description: '',
      program_manager_contact_id: '',
    },
  });

  useEffect(() => {
    if (open && companyId) {
      getAllContacts(companyId).then((res) => {
        if (res.success && res.data) setContacts(res.data);
      });
    }
  }, [open, companyId]);

  useEffect(() => {
    if (program) {
      form.reset({
        name: program.name,
        mechanism: program.mechanism || '',
        application_id: program.application_id || '',
        status: program.status,
        description: program.description || '',
        program_manager_contact_id: program.program_manager_contact_id || '',
      });
    } else {
      form.reset({
        name: '',
        mechanism: '',
        application_id: '',
        status: 'planned',
        description: '',
        program_manager_contact_id: '',
      });
    }
  }, [program]); // Removed form from dependencies - form.reset is stable

  const onSubmit = async (data: ProgramFormData) => {
    setIsSubmitting(true);

    try {
      const submitData = {
        ...data,
        program_manager_contact_id: data.program_manager_contact_id || null,
      };
      const result = program
        ? await updateClinicalProgram({ id: program.id, ...submitData })
        : await createClinicalProgram(companyId, profileId, email, submitData);

      if (result.success) {
        toast({
          title: 'Success',
          description: `Project Group ${program ? 'updated' : 'created'} successfully`,
        });
        onSuccess();
      } else {
        toast({
          title: 'Error',
          description: result.error || `Failed to ${program ? 'update' : 'create'} project group`,
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
          <DialogTitle>{program ? 'Edit Project Group' : 'Create Project Group'}</DialogTitle>
          <DialogDescription>
            {program
              ? 'Update the clinical project group information'
              : 'Create a new clinical project group'}
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
                    Project Group Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} className="h-8 text-xs" placeholder="Enter project group name" />
                  </FormControl>
                  <FormDescription className="text-[10px]">
                    Required. The display name for this clinical project group.
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="mechanism"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Mechanism</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-8 text-xs" placeholder="Enter mechanism" />
                    </FormControl>
                    <FormDescription className="text-[10px]">
                      Optional. The therapeutic mechanism of action (e.g., PD-1 inhibitor, mRNA vaccine).
                    </FormDescription>
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
                    <FormDescription className="text-[10px]">
                      Optional. An external regulatory or internal tracking identifier (e.g. IND number).
                    </FormDescription>
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
                    <FormDescription className="text-[10px]">
                      Required. The current lifecycle stage of the program.
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

            <FormField
              control={form.control}
              name="program_manager_contact_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Project Group Manager</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select project group manager" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="" className="text-xs">None</SelectItem>
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.first_name} {c.last_name}{c.email ? ` (${c.email})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-[10px]">
                    Optional. The contact responsible for managing this project group.
                  </FormDescription>
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
                      placeholder="Enter project group description"
                    />
                  </FormControl>
                  <FormDescription className="text-[10px]">
                    Optional. Additional details about the project group's purpose or scope.
                  </FormDescription>
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
