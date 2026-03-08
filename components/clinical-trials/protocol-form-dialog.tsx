'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getClinicalPrograms } from '@/lib/actions/clinical-programs';
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
import { createClinicalProtocol, updateClinicalProtocol } from '@/lib/actions/clinical-protocols';
import {
  PROTOCOL_STATUS_LABELS,
  PROTOCOL_PHASE_LABELS,
  PROTOCOL_DESIGN_LABELS,
} from '@/lib/types/clinical-trials';
import type {
  ClinicalProtocol,
  ClinicalProtocolWithRelations,
} from '@/lib/types/clinical-trials';

const PROTOCOL_TYPE_LABELS: Record<string, string> = {
  production: 'Production',
  test: 'Test',
};

const protocolSchema = z.object({
  protocol_number: z.string().min(1, 'Project number is required'),
  title: z.string().min(1, 'Title is required'),
  program_id: z.string().optional(),
  phase: z.enum(['phase_i', 'phase_ii', 'phase_iii', 'phase_iv', 'observational', 'early_feasibility_study', 'first_in_human', 'pilot_stage', 'pivotal', 'post_market']).optional(),
  status: z.enum(['planned', 'in_progress', 'on_hold', 'completed', 'terminated']),
  design: z.enum(['randomized', 'open_label', 'double_blind', 'single_blind', 'crossover', 'parallel', 'observational']).optional(),
  regions_required: z.boolean(),
  objective: z.string().optional(),
  sponsor: z.string().optional(),
  sponsor_organization_id: z.string().optional(),
  planned_start_date: z.string().optional(),
  planned_end_date: z.string().optional(),
  planned_sites_count: z.coerce.number().optional(),
  planned_subjects_count: z.coerce.number().optional(),
  test_article: z.string().optional(),
  therapeutic_group: z.string().optional(),
  type: z.enum(['production', 'test']).optional(),
});

type ProtocolFormData = z.infer<typeof protocolSchema>;

interface ProtocolFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  profileId: string;
  email: string;
  protocol?: ClinicalProtocolWithRelations | null;
  onSuccess: (updated?: ClinicalProtocol) => void;
}

export function ProtocolFormDialog({
  open,
  onOpenChange,
  companyId,
  profileId,
  email,
  protocol,
  onSuccess,
}: ProtocolFormDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);

  const loadPrograms = useCallback(async () => {
    const result = await getClinicalPrograms(companyId, { pageSize: 100 });
    if (result.success && result.data) {
      setPrograms(result.data.programs.map((p) => ({ id: p.id, name: p.name })));
    }
  }, [companyId]);

  useEffect(() => {
    if (open) {
      loadPrograms();
    }
  }, [open, loadPrograms]);

  const form = useForm<ProtocolFormData>({
    resolver: zodResolver(protocolSchema),
    defaultValues: {
      protocol_number: '',
      title: '',
      program_id: '',
      phase: undefined,
      status: 'planned',
      design: undefined,
      regions_required: true,
      objective: '',
      sponsor: '',
      sponsor_organization_id: '',
      planned_start_date: '',
      planned_end_date: '',
      planned_sites_count: undefined,
      planned_subjects_count: undefined,
      test_article: '',
      therapeutic_group: '',
      type: undefined,
    },
  });

  // Normalize date to YYYY-MM-DD for date inputs (handles ISO strings from DB)
  const toDateInput = (v: string | null | undefined): string => {
    if (!v) return '';
    const d = v.split('T')[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '';
  };

  useEffect(() => {
    if (protocol) {
      form.reset({
        protocol_number: protocol.protocol_number,
        title: protocol.title,
        program_id: protocol.program_id || '',
        phase: protocol.phase || undefined,
        status: protocol.status,
        design: protocol.design || undefined,
        regions_required: true,
        objective: protocol.objective || '',
        sponsor: protocol.sponsor || '',
        sponsor_organization_id: protocol.sponsor_organization_id || '',
        planned_start_date: toDateInput(protocol.planned_start_date),
        planned_end_date: toDateInput(protocol.planned_end_date),
        planned_sites_count: protocol.planned_sites_count ?? undefined,
        planned_subjects_count: protocol.planned_subjects_count ?? undefined,
        test_article: protocol.test_article || '',
        therapeutic_group: protocol.therapeutic_group || '',
        type: (protocol.type === 'test' ? 'test' : 'production') as 'production' | 'test' | undefined,
      });
    } else {
      form.reset({
        protocol_number: '',
        title: '',
        program_id: '',
        phase: undefined,
        status: 'planned',
        design: undefined,
        regions_required: true,
        objective: '',
        sponsor: '',
        sponsor_organization_id: '',
        planned_start_date: '',
        planned_end_date: '',
        planned_sites_count: undefined,
        planned_subjects_count: undefined,
        test_article: '',
        therapeutic_group: '',
        type: undefined,
      });
    }
  }, [protocol, form]);

  const onSubmit = async (data: ProtocolFormData) => {
    setIsSubmitting(true);

    try {
      const submitData = {
        ...data,
        program_id: data.program_id?.trim() || null,
        sponsor_organization_id: data.sponsor_organization_id?.trim() || null,
        planned_start_date: data.planned_start_date?.trim() || null,
        planned_end_date: data.planned_end_date?.trim() || null,
        test_article: data.test_article?.trim() || null,
        therapeutic_group: data.therapeutic_group?.trim() || null,
        type: data.type || null,
      };
      const result = protocol
        ? await updateClinicalProtocol({ id: protocol.id, ...submitData })
        : await createClinicalProtocol(companyId, profileId, email, submitData);

      if (result.success) {
        toast({
          title: 'Success',
          description: `Project ${protocol ? 'updated' : 'created'} successfully`,
        });
        onSuccess(result.data);
      } else {
        toast({
          title: 'Error',
          description: result.error || `Failed to ${protocol ? 'update' : 'create'} project`,
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{protocol ? 'Edit Project' : 'Create Project'}</DialogTitle>
          <DialogDescription>
            {protocol
              ? 'Update the clinical project information'
              : 'Create a new clinical project'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="protocol_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Project Number <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} className="h-8 text-xs" placeholder="e.g., PROT-001" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="program_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Project Group</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                      value={field.value && field.value !== '' ? field.value : '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select project group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-xs">None</SelectItem>
                        {programs.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    Title <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} className="h-8 text-xs" placeholder="Enter project title" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="phase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Phase</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue 
                            placeholder="Select phase"
                            getDisplayLabel={(value) => value ? PROTOCOL_PHASE_LABELS[value as keyof typeof PROTOCOL_PHASE_LABELS] : null}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PROTOCOL_PHASE_LABELS).map(([value, label]) => (
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
                name="design"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Design</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue 
                            placeholder="Select design"
                            getDisplayLabel={(value) => value ? PROTOCOL_DESIGN_LABELS[value as keyof typeof PROTOCOL_DESIGN_LABELS] : null}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PROTOCOL_DESIGN_LABELS).map(([value, label]) => (
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

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="planned_sites_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Planned Sites</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        className="h-8 text-xs"
                        placeholder="Number of sites"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="planned_subjects_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Planned Subjects</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        className="h-8 text-xs"
                        placeholder="Number of subjects"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="planned_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Planned Start</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="h-8 text-xs"
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="planned_end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Planned End</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="h-8 text-xs"
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="test_article"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Test Article</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-8 text-xs" placeholder="Test article" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="therapeutic_group"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Therapeutic Group</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-8 text-xs" placeholder="Therapeutic group" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue
                          placeholder="Select type"
                          getDisplayLabel={(value) => value ? PROTOCOL_TYPE_LABELS[value] : null}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PROTOCOL_TYPE_LABELS).map(([value, label]) => (
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
              name="objective"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Objective</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="min-h-[80px] text-xs"
                      placeholder="Enter project objective"
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
                {isSubmitting ? 'Saving...' : protocol ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
