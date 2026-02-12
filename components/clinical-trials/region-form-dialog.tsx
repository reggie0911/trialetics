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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createClinicalRegion, updateClinicalRegion } from '@/lib/actions/clinical-regions';
import { getAllClinicalProtocols } from '@/lib/actions/clinical-protocols';
import type {
  ClinicalRegionWithRelations,
  ClinicalProtocol,
} from '@/lib/types/clinical-trials';

const regionSchema = z.object({
  protocol_id: z.string().min(1, 'Protocol is required'),
  region_name: z.string().min(1, 'Region name is required'),
  planned_sites_count: z.coerce.number().optional(),
  planned_subjects_count: z.coerce.number().optional(),
});

type RegionFormData = z.infer<typeof regionSchema>;

interface RegionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  region?: ClinicalRegionWithRelations | null;
  onSuccess: () => void;
}

export function RegionFormDialog({
  open,
  onOpenChange,
  companyId,
  region,
  onSuccess,
}: RegionFormDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [protocols, setProtocols] = useState<ClinicalProtocol[]>([]);

  const form = useForm<RegionFormData>({
    resolver: zodResolver(regionSchema),
    defaultValues: {
      protocol_id: '',
      region_name: '',
      planned_sites_count: undefined,
      planned_subjects_count: undefined,
    },
  });

  useEffect(() => {
    const loadProtocols = async () => {
      const result = await getAllClinicalProtocols(companyId);
      if (result.success && result.data) {
        // Filter to only show protocols with regions_required = true
        setProtocols(result.data.filter(p => p.regions_required));
      }
    };
    loadProtocols();
  }, [companyId]);

  useEffect(() => {
    if (region) {
      form.reset({
        protocol_id: region.protocol_id,
        region_name: region.region_name,
        planned_sites_count: region.planned_sites_count ?? undefined,
        planned_subjects_count: region.planned_subjects_count ?? undefined,
      });
    } else {
      form.reset({
        protocol_id: '',
        region_name: '',
        planned_sites_count: undefined,
        planned_subjects_count: undefined,
      });
    }
  }, [region, form]);

  const onSubmit = async (data: RegionFormData) => {
    setIsSubmitting(true);

    try {
      const result = region
        ? await updateClinicalRegion({ id: region.id, ...data })
        : await createClinicalRegion(companyId, data);

      if (result.success) {
        toast({
          title: 'Success',
          description: `Region ${region ? 'updated' : 'created'} successfully`,
        });
        onSuccess();
      } else {
        toast({
          title: 'Error',
          description: result.error || `Failed to ${region ? 'update' : 'create'} region`,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{region ? 'Edit Region' : 'New Region'}</DialogTitle>
          <DialogDescription className="text-sm">
            {region
              ? 'Update region details for this protocol'
              : 'Add a new region to organize sites geographically'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="protocol_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Protocol <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!region}>
                    <FormControl>
                      <SelectTrigger className="h-10 w-[403px] [&>span]:truncate">
                        <SelectValue 
                          placeholder="Select a protocol"
                          getDisplayLabel={(value) => {
                            if (!value) return null;
                            const protocol = protocols.find(p => p.id === value);
                            return protocol ? `${protocol.protocol_number} - ${protocol.title}` : null;
                          }}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {protocols.map((protocol) => (
                        <SelectItem key={protocol.id} value={protocol.id}>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-sm">{protocol.protocol_number}</span>
                            <span className="text-xs text-muted-foreground line-clamp-1">{protocol.title}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="region_name"
              render={({ field }) => (
                <FormItem className="max-w-[407px]">
                  <FormLabel className="text-sm font-medium">
                    Region Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      className="h-10" 
                      placeholder="e.g., North America, Europe, Asia-Pacific" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="planned_sites_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Planned Sites</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        className="h-10 w-[100px]"
                        placeholder="0"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="planned_subjects_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Planned Subjects</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        className="h-10 w-[100px]"
                        placeholder="0"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t max-w-[406px]">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : region ? 'Update Region' : 'Create Region'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
