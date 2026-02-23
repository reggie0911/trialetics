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
import { Checkbox } from '@/components/ui/checkbox';
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
import { getAllClinicalPrograms } from '@/lib/actions/clinical-programs';
import {
  PROTOCOL_STATUS_LABELS,
  PROTOCOL_PHASE_LABELS,
  PROTOCOL_DESIGN_LABELS,
} from '@/lib/types/clinical-trials';
import type {
  ClinicalProtocolWithRelations,
  ClinicalProgram,
} from '@/lib/types/clinical-trials';

const protocolSchema = z.object({
  protocol_number: z.string().min(1, 'Protocol number is required'),
  title: z.string().min(1, 'Title is required'),
  program_id: z.string().optional(),
  phase: z.enum(['phase_i', 'phase_ii', 'phase_iii', 'phase_iv', 'observational', 'early_feasibility_study', 'first_in_human', 'pilot_stage', 'pivotal', 'post_market']).optional(),
  status: z.enum(['planned', 'in_progress', 'on_hold', 'completed', 'terminated']),
  design: z.enum(['randomized', 'open_label', 'double_blind', 'single_blind', 'crossover', 'parallel', 'observational']).optional(),
  regions_required: z.boolean(),
  objective: z.string().optional(),
  sponsor: z.string().optional(),
  planned_sites_count: z.coerce.number().optional(),
  planned_subjects_count: z.coerce.number().optional(),
});

type ProtocolFormData = z.infer<typeof protocolSchema>;

interface ProtocolFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  profileId: string;
  email: string;
  protocol?: ClinicalProtocolWithRelations | null;
  onSuccess: () => void;
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
  const [programs, setPrograms] = useState<ClinicalProgram[]>([]);

  const form = useForm<ProtocolFormData>({
    resolver: zodResolver(protocolSchema),
    defaultValues: {
      protocol_number: '',
      title: '',
      program_id: '',
      phase: undefined,
      status: 'planned',
      design: undefined,
      regions_required: false,
      objective: '',
      sponsor: '',
      planned_sites_count: undefined,
      planned_subjects_count: undefined,
    },
  });

  useEffect(() => {
    const loadPrograms = async () => {
      const result = await getAllClinicalPrograms(companyId);
      if (result.success && result.data) {
        setPrograms(result.data);
      }
    };
    loadPrograms();
  }, [companyId]);

  useEffect(() => {
    if (protocol) {
      form.reset({
        protocol_number: protocol.protocol_number,
        title: protocol.title,
        program_id: protocol.program_id || '',
        phase: protocol.phase || undefined,
        status: protocol.status,
        design: protocol.design || undefined,
        regions_required: protocol.regions_required,
        objective: protocol.objective || '',
        sponsor: protocol.sponsor || '',
        planned_sites_count: protocol.planned_sites_count ?? undefined,
        planned_subjects_count: protocol.planned_subjects_count ?? undefined,
      });
    } else {
      form.reset({
        protocol_number: '',
        title: '',
        program_id: '',
        phase: undefined,
        status: 'planned',
        design: undefined,
        regions_required: false,
        objective: '',
        sponsor: '',
        planned_sites_count: undefined,
        planned_subjects_count: undefined,
      });
    }
  }, [protocol, form]);

  const onSubmit = async (data: ProtocolFormData) => {
    setIsSubmitting(true);

    try {
      const result = protocol
        ? await updateClinicalProtocol({ id: protocol.id, ...data })
        : await createClinicalProtocol(companyId, profileId, email, data);

      if (result.success) {
        toast({
          title: 'Success',
          description: `Protocol ${protocol ? 'updated' : 'created'} successfully`,
        });
        onSuccess();
      } else {
        toast({
          title: 'Error',
          description: result.error || `Failed to ${protocol ? 'update' : 'create'} protocol`,
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
          <DialogTitle>{protocol ? 'Edit Protocol' : 'Create Protocol'}</DialogTitle>
          <DialogDescription>
            {protocol
              ? 'Update the clinical protocol information'
              : 'Create a new clinical protocol'}
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
                      Protocol Number <span className="text-destructive">*</span>
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
                    <FormLabel className="text-xs">Program</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue 
                            placeholder="Select program (optional)"
                            getDisplayLabel={(value) => {
                              if (!value || value === '') return null;
                              const program = programs.find(p => p.id === value);
                              return program ? program.name : null;
                            }}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="" className="text-xs">None</SelectItem>
                        {programs.map((program) => (
                          <SelectItem key={program.id} value={program.id} className="text-xs">
                            {program.name}
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
                    <Input {...field} className="h-8 text-xs" placeholder="Enter protocol title" />
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                name="sponsor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Sponsor</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-8 text-xs" placeholder="Enter sponsor" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="regions_required"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-xs">
                        Regions Required
                      </FormLabel>
                      <p className="text-[10px] text-muted-foreground">
                        Sites must belong to a region
                      </p>
                    </div>
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
                      placeholder="Enter protocol objective"
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
