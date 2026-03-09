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
import { CountryRegionEntryFields } from './country-region-entry-fields';
import { getCountryNames, GEOGRAPHIC_REGIONS } from '@/lib/data/countries';
import type { CountryEntry } from '@/lib/actions/projects';
import type {
  ClinicalRegionWithRelations,
  ClinicalProtocol,
} from '@/lib/types/clinical-trials';

const regionSchema = z.object({
  protocol_id: z.string().min(1, 'Project is required'),
});

type RegionFormData = z.infer<typeof regionSchema>;

interface RegionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  region?: ClinicalRegionWithRelations | null;
  /** Pre-select protocol when adding a new country (e.g. from project context) */
  defaultProtocolId?: string;
  /** When provided with defaultProtocolId, shows project name as static text instead of dropdown */
  defaultProtocolDisplay?: string;
  onSuccess: () => void;
}

function emptyCountryEntry(): CountryEntry {
  return {
    countryName: '',
    countryRegion: '',
    plannedSites: undefined,
    plannedSubjects: undefined,
    plannedStartDate: '',
    plannedEndDate: '',
  };
}

function regionToCountryEntry(region: ClinicalRegionWithRelations): CountryEntry {
  const countryNames = getCountryNames();
  const isCountry = countryNames.includes(region.region_name);
  const isGeographicRegion = (GEOGRAPHIC_REGIONS as readonly string[]).includes(region.region_name);
  const metadata = region.metadata as { country_region?: string } | null | undefined;
  const countryRegion = metadata?.country_region || '';

  if (isCountry) {
    return {
      id: region.id,
      countryName: region.region_name,
      countryRegion: countryRegion || undefined,
      plannedSites: region.planned_sites_count ?? undefined,
      plannedSubjects: region.planned_subjects_count ?? undefined,
      plannedStartDate: region.planned_start_date || '',
      plannedEndDate: region.planned_end_date || '',
    };
  }
  if (isGeographicRegion) {
    return {
      id: region.id,
      countryName: '',
      countryRegion: region.region_name,
      plannedSites: region.planned_sites_count ?? undefined,
      plannedSubjects: region.planned_subjects_count ?? undefined,
      plannedStartDate: region.planned_start_date || '',
      plannedEndDate: region.planned_end_date || '',
    };
  }
  return {
    id: region.id,
    countryName: '',
    countryRegion: region.region_name || countryRegion,
    plannedSites: region.planned_sites_count ?? undefined,
    plannedSubjects: region.planned_subjects_count ?? undefined,
    plannedStartDate: region.planned_start_date || '',
    plannedEndDate: region.planned_end_date || '',
  };
}

export function RegionFormDialog({
  open,
  onOpenChange,
  companyId,
  region,
  defaultProtocolId,
  defaultProtocolDisplay,
  onSuccess,
}: RegionFormDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [protocols, setProtocols] = useState<ClinicalProtocol[]>([]);
  const [countryEntry, setCountryEntry] = useState<CountryEntry>(emptyCountryEntry());

  const form = useForm<RegionFormData>({
    resolver: zodResolver(regionSchema),
    defaultValues: {
      protocol_id: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    const loadProtocols = async () => {
      const result = await getAllClinicalProtocols(companyId, undefined);
      if (result.success && result.data) {
        setProtocols(result.data);
      }
    };
    loadProtocols();
  }, [companyId, open, region]);

  useEffect(() => {
    if (!open) return;
    if (region) {
      form.reset({ protocol_id: region.protocol_id });
      setCountryEntry(regionToCountryEntry(region));
    } else {
      form.reset({ protocol_id: defaultProtocolId || '' });
      setCountryEntry(emptyCountryEntry());
    }
  }, [open, region, form, defaultProtocolId]);

  const hasProtocolSelected =
    !!form.watch('protocol_id') ||
    !!(defaultProtocolId && defaultProtocolDisplay) ||
    !!region;

  const showStaticText =
    (defaultProtocolId && defaultProtocolDisplay) || !!region;
  const isProtocolRequirementMet = showStaticText
    ? true
    : protocols.length > 0 && hasProtocolSelected;

  const onSubmit = async (data: RegionFormData) => {
    const hasCountry = !!countryEntry.countryName?.trim();
    const hasRegion = !!countryEntry.countryRegion?.trim();
    if (!hasCountry && !hasRegion) {
      toast({
        title: 'Validation error',
        description: 'Country Name or Region is required',
        variant: 'destructive',
      });
      return;
    }

    const region_name = hasCountry ? countryEntry.countryName : (countryEntry.countryRegion || '');
    const metadata = { country_region: countryEntry.countryRegion || '' };

    setIsSubmitting(true);
    try {
      const result = region
        ? await updateClinicalRegion({
            id: region.id,
            region_name,
            planned_sites_count: countryEntry.plannedSites ?? null,
            planned_subjects_count: countryEntry.plannedSubjects ?? null,
            planned_start_date: countryEntry.plannedStartDate || null,
            planned_end_date: countryEntry.plannedEndDate || null,
            metadata,
          })
        : await createClinicalRegion(companyId, {
            protocol_id: data.protocol_id || defaultProtocolId || '',
            region_name,
            planned_sites_count: countryEntry.plannedSites ?? null,
            planned_subjects_count: countryEntry.plannedSubjects ?? null,
            planned_start_date: countryEntry.plannedStartDate || null,
            planned_end_date: countryEntry.plannedEndDate || null,
            metadata,
          });

      if (result.success) {
        toast({
          title: 'Success',
          description: `Country ${region ? 'updated' : 'created'} successfully`,
        });
        onSuccess();
      } else {
        toast({
          title: 'Error',
          description: result.error || `Failed to ${region ? 'update' : 'create'} country`,
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
          <DialogTitle className="text-lg font-semibold">
            {region ? 'Edit Country' : 'New Country'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {region
              ? 'Update country details for this project'
              : 'Add a new country to organize sites geographically'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="protocol_id"
              render={({ field }) => {
                const showStaticText =
                  (defaultProtocolId && defaultProtocolDisplay) || !!region;
                const displayProtocol =
                  region
                    ? protocols.find((p) => p.id === (region.protocol_id ?? field.value))
                    : null;
                const staticDisplayText =
                  defaultProtocolId && defaultProtocolDisplay
                    ? defaultProtocolDisplay
                    : region
                      ? (displayProtocol
                          ? `${displayProtocol.protocol_number} - ${displayProtocol.title}`
                          : 'Loading...')
                      : '';

                return (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Project <span className="text-destructive">*</span>
                    </FormLabel>
                    {showStaticText ? (
                      <div className="h-10 w-full min-w-0 rounded-md border border-input bg-muted/50 px-3 flex items-center text-sm">
                        <span className="truncate">{staticDisplayText}</span>
                      </div>
                    ) : (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10 w-full [&>span]:truncate">
                            <SelectValue
                              placeholder="Select a project"
                              getDisplayLabel={(value) => {
                                if (!value) return null;
                                const protocol = protocols.find((p) => p.id === value);
                                return protocol
                                  ? `${protocol.protocol_number} - ${protocol.title}`
                                  : null;
                              }}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {protocols.length === 0 ? (
                            <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                              No projects found.
                            </div>
                          ) : (
                            protocols.map((protocol) => (
                              <SelectItem key={protocol.id} value={protocol.id}>
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium text-sm">{protocol.protocol_number}</span>
                                  <span className="text-xs text-muted-foreground line-clamp-1">
                                    {protocol.title}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    {!showStaticText && protocols.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Create a project first to add countries.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <CountryRegionEntryFields
              value={countryEntry}
              onChange={setCountryEntry}
              showDelete={false}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || (!region && !isProtocolRequirementMet)}
              >
                {isSubmitting ? 'Saving...' : region ? 'Update Country' : 'Create Country'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
