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
import { createClinicalSite, updateClinicalSite } from '@/lib/actions/clinical-sites';
import { getAllClinicalProtocols } from '@/lib/actions/clinical-protocols';
import { getAllClinicalRegions } from '@/lib/actions/clinical-regions';
import { getAllOrganizations } from '@/lib/actions/organizations';
import { getAllContacts } from '@/lib/actions/contacts';
import { SITE_STATUS_LABELS } from '@/lib/types/clinical-trials';
import type {
  ClinicalSiteWithRelations,
  ClinicalProtocol,
  ClinicalRegion,
} from '@/lib/types/clinical-trials';
import type { Organization, Contact } from '@/lib/types/contacts-organizations';

const siteSchema = z.object({
  protocol_id: z.string().min(1, 'Protocol is required'),
  region_id: z.string().optional(),
  organization_id: z.string().optional(),
  principal_investigator_id: z.string().optional(),
  site_number: z.string().optional(),
  status: z.enum(['planned', 'not_initiated', 'initiated', 'enrolling', 'closed', 'terminated']),
  planned_subject_count: z.coerce.number().optional(),
}).superRefine((data, ctx) => {
  // Validate region_id based on protocol's regions_required setting
  // This will be checked dynamically in the form component
});

type SiteFormData = z.infer<typeof siteSchema>;

interface SiteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  site?: ClinicalSiteWithRelations | null;
  onSuccess: () => void;
}

export function SiteFormDialog({
  open,
  onOpenChange,
  companyId,
  site,
  onSuccess,
}: SiteFormDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [protocols, setProtocols] = useState<ClinicalProtocol[]>([]);
  const [regions, setRegions] = useState<ClinicalRegion[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<ClinicalProtocol | null>(null);

  const form = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      protocol_id: '',
      region_id: '',
      organization_id: '',
      principal_investigator_id: '',
      site_number: '',
      status: 'planned',
      planned_subject_count: undefined,
    },
  });

  const protocolId = form.watch('protocol_id');

  useEffect(() => {
    const loadData = async () => {
      const [protocolsResult, orgsResult, contactsResult] = await Promise.all([
        getAllClinicalProtocols(companyId),
        getAllOrganizations(companyId, 'site'),
        getAllContacts(companyId),
      ]);

      if (protocolsResult.success && protocolsResult.data) {
        setProtocols(protocolsResult.data);
      }
      if (orgsResult.success && orgsResult.data) {
        setOrganizations(orgsResult.data);
      }
      if (contactsResult.success && contactsResult.data) {
        setContacts(contactsResult.data);
      }
    };
    loadData();
  }, [companyId]);

  // Load regions when protocol changes
  useEffect(() => {
    if (protocolId) {
      const protocol = protocols.find(p => p.id === protocolId);
      setSelectedProtocol(protocol || null);

      if (protocol?.regions_required) {
        getAllClinicalRegions(companyId, protocolId).then(result => {
          if (result.success && result.data) {
            setRegions(result.data);
          }
        });
      } else {
        setRegions([]);
        form.setValue('region_id', '');
      }
    }
  }, [protocolId, protocols, companyId, form]);

  useEffect(() => {
    if (site) {
      form.reset({
        protocol_id: site.protocol_id,
        region_id: site.region_id || '',
        organization_id: site.organization_id || '',
        principal_investigator_id: site.principal_investigator_id || '',
        site_number: site.site_number || '',
        status: site.status,
        planned_subject_count: site.planned_subject_count ?? undefined,
      });
    } else {
      form.reset({
        protocol_id: '',
        region_id: '',
        organization_id: '',
        principal_investigator_id: '',
        site_number: '',
        status: 'planned',
        planned_subject_count: undefined,
      });
    }
  }, [site, form]);

  const onSubmit = async (data: SiteFormData) => {
    // Edge case validation: Check if region is required
    if (selectedProtocol?.regions_required && !data.region_id) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Region is required for this protocol. Please select a region.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = site
        ? await updateClinicalSite({ id: site.id, ...data })
        : await createClinicalSite(companyId, data);

      if (result.success) {
        toast({
          title: 'Success',
          description: `Site ${site ? 'updated' : 'created'} successfully`,
        });
        onSuccess();
      } else {
        toast({
          title: 'Error',
          description: result.error || `Failed to ${site ? 'update' : 'create'} site`,
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
          <DialogTitle>{site ? 'Edit Site' : 'Create Site'}</DialogTitle>
          <DialogDescription>
            {site
              ? 'Update the clinical site information'
              : 'Create a new clinical site'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="protocol_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    Protocol <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!site}>
                    <FormControl>
                      <SelectTrigger className="h-8 text-xs max-w-[395px]">
                        <SelectValue 
                          placeholder="Select protocol"
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
                        <SelectItem key={protocol.id} value={protocol.id} className="text-xs">
                          {protocol.protocol_number} - {protocol.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {selectedProtocol?.regions_required && (
              <FormField
                control={form.control}
                name="region_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Region <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!site}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue 
                            placeholder="Select region"
                            getDisplayLabel={(value) => {
                              if (!value) return null;
                              const region = regions.find(r => r.id === value);
                              return region ? region.region_name : null;
                            }}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {regions.map((region) => (
                          <SelectItem key={region.id} value={region.id} className="text-xs">
                            {region.region_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="site_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Site Number</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-8 text-xs" placeholder="e.g., SITE-001" />
                    </FormControl>
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
                            getDisplayLabel={(value) => value ? SITE_STATUS_LABELS[value as keyof typeof SITE_STATUS_LABELS] : null}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(SITE_STATUS_LABELS).map(([value, label]) => (
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

            <FormField
              control={form.control}
              name="organization_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Organization (Site)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue 
                          placeholder="Select organization"
                          getDisplayLabel={(value) => {
                            if (!value || value === '') return null;
                            const org = organizations.find(o => o.id === value);
                            return org ? org.name : null;
                          }}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="" className="text-xs">None</SelectItem>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id} className="text-xs">
                          {org.name}
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
              name="principal_investigator_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Principal Investigator</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue 
                          placeholder="Select PI"
                          getDisplayLabel={(value) => {
                            if (!value || value === '') return null;
                            const contact = contacts.find(c => c.id === value);
                            return contact ? `${contact.first_name} ${contact.last_name}${contact.credentials ? ` (${contact.credentials})` : ''}` : null;
                          }}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="" className="text-xs">None</SelectItem>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id} className="text-xs">
                          {contact.first_name} {contact.last_name} {contact.credentials ? `(${contact.credentials})` : ''}
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
              name="planned_subject_count"
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
                {isSubmitting ? 'Saving...' : site ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
