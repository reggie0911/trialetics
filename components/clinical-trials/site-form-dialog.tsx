'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { createOrganization, checkDuplicateOrganizations } from '@/lib/actions/organizations';
import { createAddress } from '@/lib/actions/addresses';
import { getAllClinicalProtocols } from '@/lib/actions/clinical-protocols';
import { getAllClinicalRegions } from '@/lib/actions/clinical-regions';
import { getAllContacts, createContact, assignContactToOrganization } from '@/lib/actions/contacts';
import { capitalizeFirstLetter } from '@/lib/utils';
import { getCountryNames, getRegionForCountry } from '@/lib/data/countries';
import { SITE_STATUS_LABELS } from '@/lib/types/clinical-trials';
import type {
  ClinicalSiteWithRelations,
  ClinicalProtocol,
  ClinicalRegion,
} from '@/lib/types/clinical-trials';
import type { Contact } from '@/lib/types/contacts-organizations';
import { AddressFormData, emptyAddress, hasAddressData } from '@/components/contacts-organizations/address-form';

const unifiedSiteSchema = z
  .object({
    // Org fields
    name: z.string().min(1, 'Organization name is required'),
    org_status: z.enum(['active', 'inactive', 'pending']),
    country: z.string().optional(),
    site_id: z.string().optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().optional(),
    website: z.string().url('Invalid URL').optional().or(z.literal('')),
    notes: z.string().optional(),
    // CTMS site fields
    protocol_id: z.string().min(1, 'Project is required'),
    region_id: z.string().optional(),
    // PI inline create fields (create mode only)
    pi_first_name: z.string().optional(),
    pi_last_name: z.string().optional(),
    pi_email: z.string().email('Invalid email').optional().or(z.literal('')),
    pi_credentials: z.string().optional(),
    site_number: z.string().optional(),
    site_status: z.enum(['planned', 'not_initiated', 'initiated', 'enrolling', 'closed', 'terminated']),
    planned_subject_count: z.coerce.number().optional(),
  })
  .refine(
    (data) => {
      const hasAnyPiField = !!(
        data.pi_first_name?.trim() ||
        data.pi_last_name?.trim() ||
        data.pi_email?.trim() ||
        data.pi_credentials?.trim()
      );
      if (!hasAnyPiField) return true;
      return !!(data.pi_first_name?.trim() && data.pi_last_name?.trim());
    },
    {
      message: 'First name and last name are required when adding a Principal Investigator',
      path: ['pi_last_name'],
    }
  );

// Lighter schema used when editing an existing site (org fields are read-only)
const editSiteSchema = z.object({
  site_number: z.string().optional(),
  site_status: z.enum(['planned', 'not_initiated', 'initiated', 'enrolling', 'closed', 'terminated']),
  region_id: z.string().optional(),
  principal_investigator_id: z.string().optional(),
  planned_subject_count: z.coerce.number().optional(),
});

type UnifiedSiteFormData = z.infer<typeof unifiedSiteSchema>;
type EditSiteFormData = z.infer<typeof editSiteSchema>;

interface SiteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  profileId: string;
  userEmail: string;
  site?: ClinicalSiteWithRelations | null;
  /** When provided, skip org creation and assign this existing org to a protocol */
  existingOrganization?: { id: string; name: string } | null;
  /** Pre-select protocol when adding a new site (e.g. from project context) */
  defaultProtocolId?: string;
  onSuccess: () => void;
}

export function SiteFormDialog({
  open,
  onOpenChange,
  companyId,
  profileId,
  userEmail,
  site,
  existingOrganization,
  defaultProtocolId,
  onSuccess,
}: SiteFormDialogProps) {
  const isEditing = !!site;
  const isAssigning = !isEditing && !!existingOrganization;
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [protocols, setProtocols] = useState<ClinicalProtocol[]>([]);
  const [regions, setRegions] = useState<ClinicalRegion[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<ClinicalProtocol | null>(null);
  const [addressData, setAddressData] = useState<AddressFormData>(emptyAddress);
  const [orgDuplicates, setOrgDuplicates] = useState<Array<{ id: string; name: string; type: string | null }>>([]);
  const countryNames = getCountryNames();

  // --- Create form (new site) ---
  const form = useForm<UnifiedSiteFormData>({
    resolver: zodResolver(unifiedSiteSchema),
    defaultValues: {
      name: '',
      org_status: 'active',
      site_id: '',
      email: '',
      phone: '',
      website: '',
      notes: '',
      protocol_id: '',
      region_id: '',
      pi_first_name: '',
      pi_last_name: '',
      pi_email: '',
      pi_credentials: '',
      site_number: '',
      site_status: 'planned',
      planned_subject_count: undefined,
    },
  });

  // --- Edit form (existing site — CTMS fields only) ---
  const editForm = useForm<EditSiteFormData>({
    resolver: zodResolver(editSiteSchema),
    defaultValues: {
      site_number: '',
      site_status: 'planned',
      region_id: '',
      principal_investigator_id: '',
      planned_subject_count: undefined,
    },
  });

  const protocolId = form.watch('protocol_id');
  const watchName = form.watch('name');
  const watchCountry = form.watch('country');
  const derivedRegion = watchCountry ? getRegionForCountry(watchCountry) : null;

  // Duplicate detection (create mode only, not when assigning existing org)
  useEffect(() => {
    if (!open || isEditing || isAssigning) return;
    const name = watchName?.trim();
    if (!name || name.length < 3) {
      setOrgDuplicates([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await checkDuplicateOrganizations(companyId, name);
      if (res.success && res.data) setOrgDuplicates(res.data.duplicates);
    }, 500);
    return () => clearTimeout(timer);
  }, [watchName, companyId, open, isEditing, isAssigning]);

  // Load contacts (and protocols for create mode)
  useEffect(() => {
    if (!open) return;
    const loadData = async () => {
      const [protocolsResult, contactsResult] = await Promise.all([
        getAllClinicalProtocols(companyId),
        getAllContacts(companyId),
      ]);
      if (protocolsResult.success && protocolsResult.data) setProtocols(protocolsResult.data);
      if (contactsResult.success && contactsResult.data) setContacts(contactsResult.data);
    };
    loadData();
  }, [companyId, open]);

  // Load regions when protocol changes (create mode)
  useEffect(() => {
    if (!protocolId || isEditing) return;
    const protocol = protocols.find((p) => p.id === protocolId);
    setSelectedProtocol(protocol || null);
    if (protocol?.regions_required) {
      getAllClinicalRegions(companyId, protocolId).then((result) => {
        if (result.success && result.data) setRegions(result.data);
      });
    } else {
      setRegions([]);
      form.setValue('region_id', '');
    }
  }, [protocolId, protocols, companyId, form, isEditing]);

  // Load regions for edit mode based on the site's existing protocol
  useEffect(() => {
    if (!open || !isEditing || !site) return;
    const protocol = protocols.find((p) => p.id === site.protocol_id);
    setSelectedProtocol(protocol || null);
    if (protocol?.regions_required) {
      getAllClinicalRegions(companyId, site.protocol_id).then((result) => {
        if (result.success && result.data) setRegions(result.data);
      });
    }
    editForm.reset({
      site_number: site.site_number || '',
      site_status: site.status,
      region_id: site.region_id || '',
      principal_investigator_id: site.principal_investigator_id || '',
      planned_subject_count: site.planned_subject_count ?? undefined,
    });
  }, [open, isEditing, site, protocols, companyId, editForm]);

  // Reset create form on open/close
  useEffect(() => {
    if (!open || isEditing) return;
    form.reset({
      // When assigning an existing org, fill name with org name so schema validation passes
      name: existingOrganization?.name ?? '',
      org_status: 'active',
      country: '',
      site_id: '',
      email: '',
      phone: '',
      website: '',
      notes: '',
      protocol_id: defaultProtocolId ?? '',
      region_id: '',
      pi_first_name: '',
      pi_last_name: '',
      pi_email: '',
      pi_credentials: '',
      site_number: '',
      site_status: 'planned',
      planned_subject_count: undefined,
    });
    setAddressData(emptyAddress);
    setOrgDuplicates([]);
    setSelectedProtocol(null);
    setRegions([]);
  }, [open, form, isEditing, existingOrganization, defaultProtocolId]);

  // --- Edit submit ---
  const onEditSubmit = async (data: EditSiteFormData) => {
    if (!site) return;
    if (selectedProtocol?.regions_required && !data.region_id) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Country is required for this project. Please select a country.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await updateClinicalSite({
        id: site.id,
        site_number: data.site_number || null,
        status: data.site_status,
        region_id: data.region_id || null,
        principal_investigator_id: data.principal_investigator_id || null,
        planned_subject_count: data.planned_subject_count ?? null,
      });
      if (!result.success) {
        toast({
          title: 'Error updating site',
          description: result.error || 'Failed to update site',
          variant: 'destructive',
        });
        return;
      }
      toast({ title: 'Site updated', description: 'Site details have been updated.' });
      onSuccess();
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Create / Assign submit ---
  const onSubmit = async (data: UnifiedSiteFormData) => {
    if (selectedProtocol?.regions_required && !data.region_id) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Country is required for this project. Please select a country.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let orgId: string;
      let principalInvestigatorId: string | null = null;

      // Step 0: Create PI contact if PI fields are filled
      const piFirstName = data.pi_first_name?.trim();
      const piLastName = data.pi_last_name?.trim();
      if (piFirstName && piLastName) {
        const contactResult = await createContact(companyId, profileId, userEmail, {
          first_name: piFirstName,
          last_name: piLastName,
          email: data.pi_email?.trim() || null,
          credentials: data.pi_credentials?.trim() || null,
          status: 'active',
        });
        if (!contactResult.success || !contactResult.data) {
          toast({
            title: 'Error creating Principal Investigator',
            description: contactResult.error || 'Failed to create contact',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
        principalInvestigatorId = contactResult.data.id;
      }

      if (isAssigning && existingOrganization) {
        // "Assign to Protocol" flow: existing org — skip org creation
        orgId = existingOrganization.id;
      } else {
        // Step 1: Create organization (type locked to 'site')
        const orgResult = await createOrganization(companyId, profileId, userEmail, {
          name: data.name,
          organization_type: 'site',
          status: data.org_status,
          site_id: data.site_id || null,
          email: data.email || null,
          phone: data.phone || null,
          website: data.website || null,
          notes: data.notes || null,
        });

        if (!orgResult.success || !orgResult.data) {
          toast({
            title: 'Error creating organization',
            description: orgResult.error || 'Failed to create organization',
            variant: 'destructive',
          });
          return;
        }

        orgId = orgResult.data.id;

        // Step 2: Create address — persist if country or any address fields are filled
        const selectedCountry = data.country?.trim() || '';
        const addressToSave: AddressFormData = selectedCountry
          ? { ...addressData, country: selectedCountry }
          : addressData;
        if (selectedCountry || hasAddressData(addressData)) {
          await createAddress({
            entity_type: 'organization',
            entity_id: orgId,
            ...addressToSave,
          });
        }
      }

      // Step 3: Create clinical site record
      const siteResult = await createClinicalSite(companyId, {
        organization_id: orgId,
        protocol_id: data.protocol_id,
        region_id: data.region_id || null,
        principal_investigator_id: principalInvestigatorId,
        site_number: data.site_number || null,
        status: data.site_status,
        planned_subject_count: data.planned_subject_count ?? null,
      });

      if (!siteResult.success) {
        toast({
          title: 'Error creating clinical site',
          description: siteResult.error || 'Failed to create clinical site',
          variant: 'destructive',
        });
        return;
      }

      // Step 4: Assign PI contact to site organization (organization_contacts)
      if (principalInvestigatorId) {
        const assignResult = await assignContactToOrganization({
          contact_id: principalInvestigatorId,
          organization_id: orgId,
          role: 'principal_investigator',
          is_primary: false,
          status: 'active',
        });
        if (!assignResult.success) {
          toast({
            variant: 'destructive',
            title: 'Site created with warning',
            description: `Site was created but failed to link Principal Investigator to organization: ${assignResult.error}`,
          });
        }
      }

      const label = isAssigning ? existingOrganization!.name : data.name;
      toast({
        title: 'Site assigned',
        description: `${label} has been assigned to the project.`,
      });
      onSuccess();
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Edit mode UI ----
  if (isEditing && site) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xs">Edit Site</DialogTitle>
            <DialogDescription className="text-xs">
              Update clinical trial details for{' '}
              <span className="font-medium">{site.organization?.name ?? 'this site'}</span>.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              {/* Protocol (read-only) */}
              <div className="space-y-1">
                <p className="text-xs font-medium">Project</p>
                <p className="text-xs text-muted-foreground border rounded-md h-8 flex items-center px-2.5 bg-muted/40">
                  {site.protocol?.protocol_number
                    ? `${site.protocol.protocol_number} — ${site.protocol.title}`
                    : '—'}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={editForm.control}
                  name="site_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Site Number</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-8 text-xs" placeholder="e.g., 5136" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="site_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Site Status <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select status" />
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

              {selectedProtocol?.regions_required && (
                <FormField
                  control={editForm.control}
                  name="region_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Country <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select country" />
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

              <FormField
                control={editForm.control}
                name="principal_investigator_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Principal Investigator</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select PI" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="" className="text-xs">None</SelectItem>
                        {contacts
                          .filter((c) => !(c as any).is_disqualified)
                          .map((contact) => (
                            <SelectItem key={contact.id} value={contact.id} className="text-xs">
                              {contact.first_name} {contact.last_name}
                              {contact.credentials ? ` (${contact.credentials})` : ''}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="planned_subject_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Planned Subjects</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="h-8 text-xs"
                        placeholder="Number of subjects"
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
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
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Site'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }

  // ---- Create mode UI ----
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xs">
            {isAssigning ? 'Assign to Protocol' : 'Add Site'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isAssigning
              ? `Assign ${existingOrganization?.name} to a protocol as a clinical site.`
              : 'Create a new site organization and assign it to a protocol.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* When assigning, show the org name as read-only */}
            {isAssigning && existingOrganization && (
              <div className="space-y-1">
                <p className="text-xs font-medium">Organization</p>
                <p className="text-xs text-muted-foreground border rounded-md h-8 flex items-center px-2.5 bg-muted/40">
                  {existingOrganization.name}
                </p>
              </div>
            )}

            {!isAssigning && orgDuplicates.length > 0 && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-xs font-medium">Possible Duplicates Found</AlertTitle>
                <AlertDescription className="text-xs">
                  {orgDuplicates.map((d) => (
                    <span key={d.id} className="block">
                      {d.name}{d.type ? ` (${d.type})` : ''}
                    </span>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {/* Clinical Trial Assignment section */}
            <div className="border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                Clinical Trial Assignment
              </p>

              <div className="space-y-4">
                {!isAssigning && (
                  <>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            Site Name <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="h-8 text-xs min-w-[200px]"
                              placeholder="Enter name..."
                              value={field.value}
                              onChange={(e) => {
                                field.onChange(capitalizeFirstLetter(e.target.value));
                              }}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Country</FormLabel>
                          <Select
                            onValueChange={(val) => {
                              field.onChange(val);
                              setAddressData((prev) => ({ ...prev, country: val }));
                            }}
                            value={field.value ?? ''}
                          >
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs min-w-[200px]">
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="" className="text-xs">None</SelectItem>
                              {countryNames.map((name) => (
                                <SelectItem key={name} value={name} className="text-xs">
                                  {name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {derivedRegion && (
                            <p className="text-xs text-muted-foreground">
                              Country Region: <span className="font-medium">{derivedRegion}</span>
                            </p>
                          )}
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="protocol_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Project <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-xs min-w-[200px]">
                            <SelectValue
                              placeholder="Select project"
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
                          Country <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs min-w-[200px]">
                              <SelectValue
                                placeholder="Select country"
                                getDisplayLabel={(value) => {
                                  if (!value) return null;
                                  const region = regions.find((r) => r.id === value);
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
                          <Input
                            {...field}
                            className="h-8 text-xs"
                            placeholder="e.g., SITE-001"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="site_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Site Status <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs min-w-[200px]">
                              <SelectValue
                                placeholder="Select status"
                                getDisplayLabel={(value) =>
                                  value
                                    ? SITE_STATUS_LABELS[value as keyof typeof SITE_STATUS_LABELS]
                                    : null
                                }
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

                <div className="space-y-2">
                  <FormLabel className="text-xs">Principal Investigator</FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Create a new contact to assign as Principal Investigator for this site.
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="pi_first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">First Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="h-8 text-xs min-w-[200px]"
                              placeholder="First name"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pi_last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Last Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="h-8 text-xs min-w-[200px]"
                              placeholder="Last name"
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
                      name="pi_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Email</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              className="h-8 text-xs min-w-[200px]"
                              placeholder="contact@example.com"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pi_credentials"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Credentials</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="h-8 text-xs min-w-[200px]"
                              placeholder="e.g., MD, PhD"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

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
                          className="h-8 text-xs min-w-[200px]"
                          placeholder="Number of subjects"
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === '' ? undefined : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
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
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Site'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
