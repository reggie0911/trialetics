/**
 * Site Detail Page Client Component
 * Specialized view for site organizations with 4-section card layout
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Mail, Phone, Globe, MapPin, Building2, Users, Calendar, FileText, Plus, CalendarCheck, Trash2, FileSignature, FileCheck, Network, UserPlus, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  OrganizationWithRelations,
  OrganizationNote,
  ORGANIZATION_TYPE_LABELS,
  ENTITY_STATUS_LABELS,
  CONTACT_ROLE_LABELS,
  type Contact,
} from '@/lib/types/contacts-organizations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { setPrimaryRoleContact, type PrimaryRoleType } from '@/lib/actions/contacts';
import { OrganizationFormDialog } from './organization-form-dialog';
import { SiteMilestoneDialog } from './site-milestone-dialog';
import { ProjectAssignmentDialog } from './project-assignment-dialog';
import { OrganizationMap } from './organization-map';
import { ActivityTimeline } from './activity-timeline';
import { OrganizationNotesSheet } from './organization-notes-sheet';
import { ArchiveContactDialog } from './archive-contact-dialog';
import { SiteVisitDialog } from './site-visit-dialog';
import { SiteContractDialog } from './site-contract-dialog';
import { SiteDocumentDialog } from './site-document-dialog';
import { SatelliteSitesDialog } from './satellite-sites-dialog';
import { SiteTeamMemberDialog } from './site-team-member-dialog';
import { deleteSiteVisit } from '@/lib/actions/site-visits';
import { deleteSiteContract } from '@/lib/actions/site-contracts';
import { deleteSiteDocument } from '@/lib/actions/site-documents';
import { removeOrganizationTeamMember } from '@/lib/actions/organization-team-members';
import {
  SITE_VISIT_TYPE_LABELS,
  SITE_VISIT_STATUS_LABELS,
  SITE_CONTRACT_TYPE_LABELS,
  SITE_CONTRACT_STATUS_LABELS,
  SITE_DOCUMENT_TYPE_LABELS,
  SITE_DOCUMENT_STATUS_LABELS,
  type SiteVisit,
  type SiteVisitType,
  type SiteContract,
  type SiteContractType,
  type SiteDocument,
  type SiteDocumentType,
} from '@/lib/types/contacts-organizations';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { formatFieldName } from '@/lib/utils';
import type { OrganizationContactWithContact } from '@/lib/types/contacts-organizations';
import type { OrganizationClinicalTrials } from '@/lib/actions/organization-clinical-trials';

interface OrganizationStatusHistoryItem {
  id: string;
  old_status: string;
  new_status: string;
  changed_at: string;
  changed_by_email: string | null;
}

interface SiteVisitItem extends SiteVisit {}
interface SiteContractItem extends SiteContract {}
interface SiteDocumentItem extends SiteDocument {}

interface SatelliteSiteItem {
  id: string;
  name: string;
  status: string;
  organization_type: string;
}

interface ParentSiteItem {
  id: string;
  name: string;
  status: string;
}

interface SiteTeamMemberItem {
  id: string;
  organization_id: string;
  profile_id: string;
  role: string;
  profile?: { id: string; first_name: string | null; email: string | null };
}

interface SiteDetailPageClientProps {
  organization: OrganizationWithRelations;
  activities: any[];
  notes: OrganizationNote[];
  clinicalTrials?: OrganizationClinicalTrials;
  statusHistory: OrganizationStatusHistoryItem[];
  siteVisits: SiteVisitItem[];
  siteContracts: SiteContractItem[];
  siteDocuments: SiteDocumentItem[];
  satelliteSites: SatelliteSiteItem[];
  parentSite: ParentSiteItem | null;
  siteTeamMembers: SiteTeamMemberItem[];
  profiles: Array<{ id: string; first_name: string | null; email: string | null }>;
  contacts?: Contact[];
  companyId: string;
  profileId: string;
  userEmail: string;
  siteVisitToTripReport?: Record<string, string>;
}

export function SiteDetailPageClient({
  organization: initialOrg,
  activities: initialActivities,
  notes: initialNotes,
  clinicalTrials = { clinical_sites: [], protocol_assignments: [], protocol_accounts: [] },
  statusHistory = [],
  siteVisits = [],
  siteContracts = [],
  siteDocuments = [],
  satelliteSites = [],
  parentSite = null,
  siteTeamMembers = [],
  profiles = [],
  contacts = [],
  companyId,
  profileId,
  userEmail,
  siteVisitToTripReport = {},
}: SiteDetailPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [showNotesSheet, setShowNotesSheet] = useState(false);
  const [contactToArchive, setContactToArchive] = useState<OrganizationContactWithContact | null>(null);
  const [showSiteVisitDialog, setShowSiteVisitDialog] = useState(false);
  const [editingVisit, setEditingVisit] = useState<SiteVisit | null>(null);
  const [visitToDelete, setVisitToDelete] = useState<SiteVisit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [editingContract, setEditingContract] = useState<SiteContract | null>(null);
  const [contractToDelete, setContractToDelete] = useState<SiteContract | null>(null);
  const [isDeletingContract, setIsDeletingContract] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [editingDocument, setEditingDocument] = useState<SiteDocument | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<SiteDocument | null>(null);
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);
  const [showSetParentDialog, setShowSetParentDialog] = useState(false);
  const [showAddSatelliteDialog, setShowAddSatelliteDialog] = useState(false);
  const [showTeamMemberDialog, setShowTeamMemberDialog] = useState(false);
  const [teamMemberToRemove, setTeamMemberToRemove] = useState<SiteTeamMemberItem | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [showAssignProject, setShowAssignProject] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<PrimaryRoleType | null>(null);

  const handleBack = () => {
    router.push('/protected/contacts-organizations');
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    router.refresh();
  };

  const handleMilestoneSuccess = () => {
    setShowMilestoneDialog(false);
    router.refresh();
    toast({
      title: 'Milestones updated',
      description: 'Site milestones have been updated successfully.',
    });
  };

  const handleAssignProtocolSuccess = () => {
    setShowAssignProject(false);
    router.refresh();
    toast({
      title: 'Protocol assigned',
      description: 'This site can now track milestone data. Click Edit to enter details.',
    });
  };

  const handlePrimaryRoleChange = async (role: PrimaryRoleType, contactId: string | null) => {
    setUpdatingRole(role);
    const result = await setPrimaryRoleContact(initialOrg.id, role, contactId);
    setUpdatingRole(null);
    if (result.success) {
      router.refresh();
      toast({
        title: 'Primary role updated',
        description: 'The role assignment has been updated.',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to update primary role',
        variant: 'destructive',
      });
    }
  };

  const getContactDisplayName = (contact: Contact) =>
    [contact.first_name, contact.last_name].filter(Boolean).join(' ') ||
    contact.email ||
    contact.id;

  const primaryAddress = initialOrg.addresses?.find((addr) => addr.address_type === 'primary');
  
  // Get the first project (assuming site-project relationship)
  const siteProject = initialOrg.projects?.[0];
  
  // Get role-specific contacts
  const principalInvestigator = initialOrg.contacts?.find((oc) => oc.role === 'principal_investigator');
  const coordinator = initialOrg.contacts?.find((oc) => oc.role === 'coordinator');
  const clinicalMonitor = initialOrg.contacts?.find((oc) => oc.role === 'site_staff');

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const getAssigneeName = (profileId: string | null) => {
    if (!profileId) return null;
    const p = profiles.find((pr) => pr.id === profileId);
    return p?.first_name || p?.email || null;
  };

  const handleSiteVisitSuccess = () => {
    setShowSiteVisitDialog(false);
    setEditingVisit(null);
    router.refresh();
  };

  const handleDeleteVisit = async () => {
    if (!visitToDelete) return;
    setIsDeleting(true);
    const result = await deleteSiteVisit(visitToDelete.id);
    if (result.success) {
      setVisitToDelete(null);
      router.refresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete visit',
        variant: 'destructive',
      });
    }
    setIsDeleting(false);
  };

  const handleContractSuccess = () => {
    setShowContractDialog(false);
    setEditingContract(null);
    router.refresh();
  };

  const handleDeleteContract = async () => {
    if (!contractToDelete) return;
    setIsDeletingContract(true);
    const result = await deleteSiteContract(contractToDelete.id);
    if (result.success) {
      setContractToDelete(null);
      router.refresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete contract',
        variant: 'destructive',
      });
    }
    setIsDeletingContract(false);
  };

  const handleDocumentSuccess = () => {
    setShowDocumentDialog(false);
    setEditingDocument(null);
    router.refresh();
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;
    setIsDeletingDocument(true);
    const result = await deleteSiteDocument(documentToDelete.id);
    if (result.success) {
      setDocumentToDelete(null);
      router.refresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete document',
        variant: 'destructive',
      });
    }
    setIsDeletingDocument(false);
  };

  const getPayeeName = (contactId: string | null) => {
    if (!contactId) return null;
    const oc = initialOrg.contacts?.find((c) => c.contact_id === contactId);
    return oc?.contact ? `${oc.contact.first_name || ''} ${oc.contact.last_name || ''}`.trim() || null : null;
  };

  const handleRemoveTeamMember = async () => {
    if (!teamMemberToRemove) return;
    setIsRemovingMember(true);
    const result = await removeOrganizationTeamMember(teamMemberToRemove.id);
    if (result.success) {
      setTeamMemberToRemove(null);
      router.refresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsRemovingMember(false);
  };

  const protocols = initialOrg.projects?.map((p) => ({
    id: p.protocol.id,
    protocol_number: p.protocol.protocol_number,
    protocol_name: p.protocol.title,
  })) ?? [];

  const contractContacts = Array.from(
    new Map(
      (initialOrg.contacts ?? [])
        .filter((oc) => oc.contact)
        .map((oc) => [oc.contact!.id, { id: oc.contact!.id, first_name: oc.contact!.first_name, last_name: oc.contact!.last_name }])
    ).values()
  );

  return (
    <>
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        {/* Header with Back button */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={handleBack} className="text-xs md:text-xs">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts & Organizations
          </Button>
          <div className="flex gap-2">
            <Button onClick={() => setShowNotesSheet(true)} variant="outline" className="text-xs md:text-xs">
              <FileText className="h-4 w-4 mr-2" />
              Notes
            </Button>
            <Button onClick={() => setShowEditDialog(true)} className="text-xs md:text-xs">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        {/* Site name and badges */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-[32px] font-semibold tracking-[-1px]">{initialOrg.name}</h1>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs capitalize">
              {ORGANIZATION_TYPE_LABELS[initialOrg.organization_type]}
            </Badge>
            <Badge
              variant={initialOrg.status === 'active' ? 'default' : 'secondary'}
              className="text-xs capitalize"
            >
              {ENTITY_STATUS_LABELS[initialOrg.status]}
            </Badge>
          </div>
        </div>

        {/* Main Content: 3x6 Grid Layout */}
        <div className="grid grid-cols-6 gap-6">
          {/* Contact Information Card - spans 2 columns */}
          <Card className="col-span-2 row-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs md:text-xs font-medium">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {primaryAddress && (
                <>
                  <div className="flex items-start gap-2 text-xs md:text-xs">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="space-y-1">
                        <p>{primaryAddress.street_1}</p>
                        {primaryAddress.street_2 && <p>{primaryAddress.street_2}</p>}
                        <p>
                          {primaryAddress.city}, {primaryAddress.state} {primaryAddress.postal_code}
                        </p>
                        <p>{primaryAddress.country}</p>
                      </div>
                    </div>
                  </div>

                  {/* Map Visual */}
                  <div className="mt-4">
                    <OrganizationMap organizationName={initialOrg.name} address={primaryAddress} />
                  </div>
                </>
              )}
              {initialOrg.phone && (
                <div className="flex items-start gap-2 text-xs md:text-xs">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <span className="text-muted-foreground">Primary Phone: </span>
                    <span className="font-medium">{initialOrg.phone}</span>
                  </div>
                </div>
              )}
              {initialOrg.website && (
                <div className="flex items-start gap-2 text-xs md:text-xs">
                  <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <a href={initialOrg.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600">
                      {initialOrg.website}
                    </a>
                  </div>
                </div>
              )}
              {!primaryAddress && !initialOrg.phone && !initialOrg.website && (
                <p className="text-xs md:text-xs text-muted-foreground">No contact information available</p>
              )}
            </CardContent>
          </Card>

          {/* Profile Information Card - spans 2 columns */}
          <Card className="col-span-2 row-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs md:text-xs font-medium">Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs md:text-xs">
              {/* Profile Information Section */}
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Site ID: </span>
                  <span className="font-medium">{initialOrg.site_id ?? initialOrg.id.slice(0, 8)}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Institution Type: </span>
                  <span className="font-medium capitalize">{ORGANIZATION_TYPE_LABELS[initialOrg.organization_type]}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Institution Status: </span>
                  <span className="font-medium capitalize">{ENTITY_STATUS_LABELS[initialOrg.status]}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Database Active Status: </span>
                  <span className="font-medium">{siteProject?.status === 'active' ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Database Active Date: </span>
                  <span className="font-medium">{formatDate(siteProject?.start_date)}</span>
                </div>
              </div>
              {siteProject?.end_date && (
                <>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <span className="text-muted-foreground">Database De-active Date: </span>
                      <span className="font-medium">{formatDate(siteProject.end_date)}</span>
                    </div>
                  </div>
                  {initialOrg.notes && (
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <span className="text-muted-foreground">Database De-active Reason: </span>
                        <span className="font-medium">{initialOrg.notes}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Primary Roles Section */}
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-xs md:text-xs font-medium mb-3">Primary Roles</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <span className="text-muted-foreground block">Principal Investigator</span>
                      <Select
                        value={principalInvestigator?.contact?.id ?? ''}
                        onValueChange={(v) => handlePrimaryRoleChange('principal_investigator', v || null)}
                        disabled={updatingRole === 'principal_investigator' || contacts.length === 0}
                      >
                        <SelectTrigger className="text-xs h-8 w-full">
                          <SelectValue
                            placeholder="Select..."
                            getDisplayLabel={(v) => {
                              if (!v) return 'None';
                              const c = contacts.find((x) => x.id === v);
                              return c ? getContactDisplayName(c) : v;
                            }}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="" className="text-xs">None</SelectItem>
                          {contacts.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {getContactDisplayName(c)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <span className="text-muted-foreground block">Research Director</span>
                      <Select
                        value={coordinator?.contact?.id ?? ''}
                        onValueChange={(v) => handlePrimaryRoleChange('coordinator', v || null)}
                        disabled={updatingRole === 'coordinator' || contacts.length === 0}
                      >
                        <SelectTrigger className="text-xs h-8 w-full">
                          <SelectValue
                            placeholder="Select..."
                            getDisplayLabel={(v) => {
                              if (!v) return 'None';
                              const c = contacts.find((x) => x.id === v);
                              return c ? getContactDisplayName(c) : v;
                            }}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="" className="text-xs">None</SelectItem>
                          {contacts.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {getContactDisplayName(c)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <span className="text-muted-foreground block">Clinical Monitor</span>
                      <Select
                        value={clinicalMonitor?.contact?.id ?? ''}
                        onValueChange={(v) => handlePrimaryRoleChange('site_staff', v || null)}
                        disabled={updatingRole === 'site_staff' || contacts.length === 0}
                      >
                        <SelectTrigger className="text-xs h-8 w-full">
                          <SelectValue
                            placeholder="Select..."
                            getDisplayLabel={(v) => {
                              if (!v) return 'None';
                              const c = contacts.find((x) => x.id === v);
                              return c ? getContactDisplayName(c) : v;
                            }}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="" className="text-xs">None</SelectItem>
                          {contacts.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {getContactDisplayName(c)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {contacts.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No contacts available. Create contacts first.</p>
                  )}
                </div>
              </div>

              {/* IRB/EC Institutions Section */}
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-xs md:text-xs font-medium mb-3">IRB/EC Institutions</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <span className="text-muted-foreground">Local Institutional Review Board: </span>
                      <span className="font-medium">{siteProject?.irb_institution_name || 'N/A'}</span>
                    </div>
                  </div>
                  {siteProject?.irb_approval_number && (
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <span className="text-muted-foreground">IRB Approval Number: </span>
                        <span className="font-medium">{siteProject.irb_approval_number}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity History - spans 2 columns and 3 rows (right side) */}
          <div className="col-span-2 row-span-3">
            <ActivityTimeline activities={initialActivities} />
          </div>

          {/* Site Milestones Card - spans 2 columns */}
          <Card className="col-span-2 row-span-1">
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-xs md:text-xs font-medium">Site Milestones</CardTitle>
              {siteProject && (
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowMilestoneDialog(true)}
                      className="text-xs md:text-xs"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit milestones
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit site qualification dates, subject counts, and visit dates</TooltipContent>
                </Tooltip>
              )}
            </CardHeader>
            <CardContent className="text-xs md:text-xs">
              {!siteProject ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
                  <Link2 className="h-10 w-10 text-muted-foreground/70 mb-4" />
                  <h3 className="font-medium text-foreground mb-1">No protocol linked</h3>
                  <p className="text-muted-foreground max-w-[280px] mb-5">
                    Link this site to a clinical trial to track qualification dates, enrollment counts, and visit milestones.
                  </p>
                  <Button
                    onClick={() => setShowAssignProject(true)}
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Assign Protocol
                  </Button>
                </div>
              ) : (
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-muted-foreground">Site Qualification Date: </span>
                      <span className="font-medium">{formatDate(siteProject?.site_qualification_date)}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-muted-foreground">First Subject Enrolled Date: </span>
                      <span className="font-medium">{formatDate(siteProject?.first_subject_enrolled_date)}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-muted-foreground">Subject Screen Failure Count: </span>
                      <span className="font-medium">{siteProject?.screen_failure_count ?? 0}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-muted-foreground">Subject Enrolled Count: </span>
                      <span className="font-medium">{siteProject?.enrolled_subject_count ?? 0}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-muted-foreground">First Completed Visit Date: </span>
                      <span className="font-medium">{formatDate(siteProject?.first_subject_enrolled_date)}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-muted-foreground">Last Completed Visit Date: </span>
                      <span className="font-medium">{formatDate(siteProject?.last_completed_visit_date)}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-muted-foreground">Last Subject Off Study: </span>
                      <span className="font-medium">{formatDate(siteProject?.last_subject_enrolled_date)}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-muted-foreground">Close-Out Date: </span>
                      <span className="font-medium">{formatDate(siteProject?.close_out_date)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Staff Members Card - spans 2 columns */}
          <Card className="col-span-2 row-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs md:text-xs font-medium">
                Active Staff Members
                {` (${(initialOrg.contacts ?? []).filter(
                  (oc) => oc.status === 'active' && (!oc.end_date || new Date(oc.end_date) >= new Date())
                ).length})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs md:text-xs">
              {(() => {
                const activeContacts = (initialOrg.contacts ?? []).filter(
                  (oc) => oc.status === 'active' && (!oc.end_date || new Date(oc.end_date) >= new Date())
                );
                if (activeContacts.length === 0) {
                  return (
                    <p className="text-muted-foreground italic">No active staff assigned</p>
                  );
                }
                return activeContacts.map((oc) => (
                  <div key={oc.id} className="flex items-start gap-2 group">
                    <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {oc.contact?.credentials ? `${oc.contact.credentials} ` : ''}
                        {oc.contact?.first_name} {oc.contact?.last_name}
                      </div>
                      <div className="text-muted-foreground">
                        {oc.role && oc.role !== 'other'
                          ? (CONTACT_ROLE_LABELS[oc.role as keyof typeof CONTACT_ROLE_LABELS] || formatFieldName(oc.role))
                          : (oc.contact?.title || CONTACT_ROLE_LABELS.other)}
                      </div>
                    </div>
                    <Badge variant="default" className="text-xs bg-green-100 text-green-800 hover:bg-green-100 flex-shrink-0">
                      Active
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                      asChild
                    >
                      <Link
                        href={`/protected/contacts-organizations/contact/${oc.contact?.id}`}
                        title="Edit contact"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                ));
              })()}
            </CardContent>
          </Card>

          {/* Status History Card - spans 2 columns */}
          <Card className="col-span-2 row-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs md:text-xs font-medium">Status History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs md:text-xs">
              {statusHistory.length === 0 ? (
                <p className="text-muted-foreground italic">No status changes recorded</p>
              ) : (
                statusHistory.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {ENTITY_STATUS_LABELS[entry.old_status as keyof typeof ENTITY_STATUS_LABELS] || formatFieldName(entry.old_status)}
                        {' → '}
                        {ENTITY_STATUS_LABELS[entry.new_status as keyof typeof ENTITY_STATUS_LABELS] || formatFieldName(entry.new_status)}
                      </div>
                      <div className="text-muted-foreground">
                        {formatDate(entry.changed_at)}
                        {entry.changed_by_email && (
                          <span className="ml-1">· {entry.changed_by_email}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Clinical Trials Card - protocols this site participates in */}
          {clinicalTrials.clinical_sites.length > 0 && (
            <Card className="col-span-2 row-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs md:text-xs font-medium">Clinical Trials</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Protocols this site participates in
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-xs md:text-xs">
                {clinicalTrials.clinical_sites.map((cs) => (
                  <div key={cs.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">
                        {cs.protocol?.protocol_number} - {cs.protocol?.title}
                      </p>
                      <p className="text-muted-foreground">
                        Site {cs.site_number ?? '—'} • {cs.region?.region_name ?? '—'} • {cs.status}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {[
                        { label: 'SDV', href: '/protected/sdv-tracker' },
                        { label: 'AE', href: '/protected/ae' },
                        { label: 'eCRF', href: '/protected/ecrf-query-tracker' },
                        { label: 'VW', href: '/protected/vw' },
                        { label: 'MC', href: '/protected/mc' },
                        { label: 'Patients', href: '/protected/patients' },
                      ].map(({ label, href }) => (
                        <Button key={href} variant="ghost" size="sm" asChild className="text-xs h-7">
                          <Link href={`${href}?protocol=${cs.protocol_id}`}>
                            {label}
                          </Link>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Site Visits Card - spans 2 columns */}
          <Card className="col-span-2 row-span-1">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs md:text-xs font-medium">Site Visits</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setEditingVisit(null);
                  setShowSiteVisitDialog(true);
                }}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Visit
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-xs md:text-xs">
              {siteVisits.length === 0 ? (
                <p className="text-muted-foreground italic">No site visits scheduled</p>
              ) : (
                siteVisits.map((visit) => (
                  <div key={visit.id} className="flex items-start gap-2 group">
                    <CalendarCheck className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{visit.visit_name}</div>
                      <div className="text-muted-foreground">
                        {SITE_VISIT_TYPE_LABELS[visit.visit_type as SiteVisitType] || formatFieldName(visit.visit_type)}
                        {' · '}
                        {formatDateTime(visit.visit_start)}
                        {getAssigneeName(visit.assigned_to_id) && (
                          <span> · {getAssigneeName(visit.assigned_to_id)}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">
                      {SITE_VISIT_STATUS_LABELS[visit.visit_status as keyof typeof SITE_VISIT_STATUS_LABELS] || formatFieldName(visit.visit_status)}
                    </Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {siteVisitToTripReport[visit.id] ? (
                        <Link href={`/protected/trip-reports/${siteVisitToTripReport[visit.id]}`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" title="View Trip Report">
                            <FileText className="h-3 w-3 mr-1" />
                            Trip Report
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/protected/trip-reports?createFrom=${visit.id}`}>
                          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" title="Create Trip Report">
                            <Plus className="h-3 w-3 mr-1" />
                            Trip Report
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setEditingVisit(visit);
                          setShowSiteVisitDialog(true);
                        }}
                        title="Edit"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setVisitToDelete(visit)}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Contracts Card - spans 2 columns */}
          <Card className="col-span-2 row-span-1">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs md:text-xs font-medium">Contracts</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setEditingContract(null);
                  setShowContractDialog(true);
                }}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Contract
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-xs md:text-xs">
              {siteContracts.length === 0 ? (
                <p className="text-muted-foreground italic">No contracts associated</p>
              ) : (
                siteContracts.map((contract) => (
                  <div key={contract.id} className="flex items-start gap-2 group">
                    <FileSignature className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {SITE_CONTRACT_TYPE_LABELS[contract.contract_type as SiteContractType]}
                        {contract.contract_amount != null && (
                          <span className="text-muted-foreground ml-1">
                            {contract.currency_code || 'USD'} {Number(contract.contract_amount).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {getPayeeName(contract.payee_contact_id) && (
                          <span>Payee: {getPayeeName(contract.payee_contact_id)}</span>
                        )}
                        {contract.effective_date && (
                          <span className="ml-1">· Effective {formatDate(contract.effective_date)}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">
                      {SITE_CONTRACT_STATUS_LABELS[contract.status as keyof typeof SITE_CONTRACT_STATUS_LABELS]}
                    </Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setEditingContract(contract);
                          setShowContractDialog(true);
                        }}
                        title="Edit"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setContractToDelete(contract)}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Documents Card - spans 2 columns */}
          <Card className="col-span-2 row-span-1">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs md:text-xs font-medium">Documents</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setEditingDocument(null);
                  setShowDocumentDialog(true);
                }}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Document
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-xs md:text-xs">
              {siteDocuments.length === 0 ? (
                <p className="text-muted-foreground italic">No documents tracked</p>
              ) : (
                siteDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-start gap-2 group">
                    <FileCheck className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{doc.document_name}</div>
                      <div className="text-muted-foreground">
                        {SITE_DOCUMENT_TYPE_LABELS[doc.document_type as SiteDocumentType]}
                        {doc.received_date && (
                          <span className="ml-1">· Received {formatDate(doc.received_date)}</span>
                        )}
                        {doc.expiration_date && (
                          <span className="ml-1">· Expires {formatDate(doc.expiration_date)}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">
                      {SITE_DOCUMENT_STATUS_LABELS[doc.status as keyof typeof SITE_DOCUMENT_STATUS_LABELS]}
                    </Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setEditingDocument(doc);
                          setShowDocumentDialog(true);
                        }}
                        title="Edit"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDocumentToDelete(doc)}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Satellite Sites Card */}
          <Card className="col-span-2 row-span-1">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs md:text-xs font-medium">Satellite Sites</CardTitle>
              <div className="flex gap-1">
                <Button size="sm" onClick={() => setShowSetParentDialog(true)} className="text-xs">
                  Set Parent
                </Button>
                <Button size="sm" onClick={() => setShowAddSatelliteDialog(true)} className="text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Satellite
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs md:text-xs">
              {parentSite && (
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Parent:</span>
                  <Button variant="link" className="h-auto p-0 text-xs font-medium" onClick={() => router.push(`/protected/contacts-organizations/${parentSite.id}`)}>
                    {parentSite.name}
                  </Button>
                </div>
              )}
              {satelliteSites.length > 0 ? (
                satelliteSites.map((sit) => (
                  <div key={sit.id} className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Button variant="link" className="h-auto p-0 text-xs font-medium" onClick={() => router.push(`/protected/contacts-organizations/${sit.id}`)}>
                      {sit.name}
                    </Button>
                  </div>
                ))
              ) : !parentSite && (
                <p className="text-muted-foreground italic">No parent or satellite sites linked</p>
              )}
            </CardContent>
          </Card>

          {/* Site Team Card */}
          <Card className="col-span-2 row-span-1">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs md:text-xs font-medium">Site Team</CardTitle>
              <Button size="sm" onClick={() => setShowTeamMemberDialog(true)} className="text-xs">
                <UserPlus className="h-3 w-3 mr-1" />
                Add Member
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-xs md:text-xs">
              {siteTeamMembers.length === 0 ? (
                <p className="text-muted-foreground italic">No team members assigned</p>
              ) : (
                siteTeamMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 group">
                    <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1">{m.profile?.first_name || m.profile?.email || m.profile_id}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                      onClick={() => setTeamMemberToRemove(m)}
                      title="Remove"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Contact History Card - spans 2 columns */}
          <Card className="col-span-2 row-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs md:text-xs font-medium">Contact History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs md:text-xs">
              {(() => {
                const now = new Date();
                const archivedContacts = (initialOrg.contacts ?? []).filter(
                  (oc) => oc.end_date != null && new Date(oc.end_date) < now
                ).sort((a, b) => {
                  const dateA = new Date(a.end_date!).getTime();
                  const dateB = new Date(b.end_date!).getTime();
                  return dateB - dateA;
                });
                if (archivedContacts.length === 0) {
                  return (
                    <p className="text-muted-foreground italic">No archived contacts</p>
                  );
                }
                return archivedContacts.map((oc) => (
                  <div key={oc.id} className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0 opacity-60" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {oc.contact?.credentials ? `${oc.contact.credentials} ` : ''}
                        {oc.contact?.first_name} {oc.contact?.last_name}
                      </div>
                      <div className="text-muted-foreground">
                        {CONTACT_ROLE_LABELS[oc.role] || formatFieldName(oc.role)}
                        {oc.end_date && (
                          <span className="ml-1">· Ended {formatDate(oc.end_date)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit Dialog */}
      <OrganizationFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        organization={initialOrg}
        companyId={companyId}
        profileId={profileId}
        userEmail={userEmail}
        onSuccess={handleEditSuccess}
      />

      {/* Milestone Edit Dialog */}
      {siteProject && (
        <SiteMilestoneDialog
          open={showMilestoneDialog}
          onOpenChange={setShowMilestoneDialog}
          organizationProjectId={siteProject.id}
          milestones={siteProject}
          onSuccess={handleMilestoneSuccess}
        />
      )}

      {/* Assign Protocol Dialog */}
      <ProjectAssignmentDialog
        open={showAssignProject}
        onOpenChange={setShowAssignProject}
        entityType="organization"
        entityId={initialOrg.id}
        entityName={initialOrg.name}
        companyId={companyId}
        existingProjectIds={(initialOrg.projects ?? []).map((op) => (op as { protocol?: { id: string }; protocol_id?: string }).protocol?.id ?? (op as { protocol_id?: string }).protocol_id).filter(Boolean) as string[]}
        onSuccess={handleAssignProtocolSuccess}
      />

      {/* Notes Sheet */}
      <OrganizationNotesSheet
        open={showNotesSheet}
        onOpenChange={setShowNotesSheet}
        organizationId={initialOrg.id}
        organizationName={initialOrg.name}
        companyId={companyId}
        profileId={profileId}
        userEmail={userEmail}
        initialNotes={initialNotes}
      />

      {/* Archive Contact Dialog */}
      <ArchiveContactDialog
        open={!!contactToArchive}
        onOpenChange={(open) => !open && setContactToArchive(null)}
        onSuccess={() => {
          setContactToArchive(null);
          router.refresh();
        }}
        organizationContact={contactToArchive}
        organizationName={initialOrg.name}
      />

      {/* Site Visit Dialog */}
      <SiteVisitDialog
        open={showSiteVisitDialog}
        onOpenChange={setShowSiteVisitDialog}
        onSuccess={handleSiteVisitSuccess}
        organizationId={initialOrg.id}
        companyId={companyId}
        visit={editingVisit}
        protocols={protocols}
      />

      {/* Delete Visit Confirmation */}
      <AlertDialog open={!!visitToDelete} onOpenChange={() => setVisitToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xs">Delete Site Visit</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete &quot;{visitToDelete?.visit_name}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs text-destructive hover:bg-destructive/10"
              onClick={handleDeleteVisit}
              disabled={isDeleting}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Site Contract Dialog */}
      <SiteContractDialog
        open={showContractDialog}
        onOpenChange={setShowContractDialog}
        onSuccess={handleContractSuccess}
        organizationId={initialOrg.id}
        contract={editingContract}
        protocols={protocols}
        contacts={contractContacts}
      />

      {/* Delete Contract Confirmation */}
      <AlertDialog open={!!contractToDelete} onOpenChange={() => setContractToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xs">Delete Contract</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete this contract? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs text-destructive hover:bg-destructive/10"
              onClick={handleDeleteContract}
              disabled={isDeletingContract}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Site Document Dialog */}
      <SiteDocumentDialog
        open={showDocumentDialog}
        onOpenChange={setShowDocumentDialog}
        onSuccess={handleDocumentSuccess}
        organizationId={initialOrg.id}
        document={editingDocument}
        protocols={protocols}
      />

      {/* Delete Document Confirmation */}
      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xs">Delete Document</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete &quot;{documentToDelete?.document_name}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs text-destructive hover:bg-destructive/10"
              onClick={handleDeleteDocument}
              disabled={isDeletingDocument}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Satellite Sites Dialogs */}
      <SatelliteSitesDialog
        open={showSetParentDialog}
        onOpenChange={setShowSetParentDialog}
        onSuccess={() => router.refresh()}
        mode="set_parent"
        organizationId={initialOrg.id}
        organizationName={initialOrg.name}
        companyId={companyId}
        currentParentId={parentSite?.id ?? initialOrg.parent_organization_id}
        satelliteIds={satelliteSites.map((s) => s.id)}
      />
      <SatelliteSitesDialog
        open={showAddSatelliteDialog}
        onOpenChange={setShowAddSatelliteDialog}
        onSuccess={() => router.refresh()}
        mode="add_satellite"
        organizationId={initialOrg.id}
        organizationName={initialOrg.name}
        companyId={companyId}
        satelliteIds={satelliteSites.map((s) => s.id)}
      />

      {/* Site Team Member Dialog */}
      <SiteTeamMemberDialog
        open={showTeamMemberDialog}
        onOpenChange={setShowTeamMemberDialog}
        onSuccess={() => router.refresh()}
        organizationId={initialOrg.id}
        profiles={profiles}
        existingMemberIds={siteTeamMembers.map((m) => m.profile_id)}
      />

      {/* Remove Team Member Confirmation */}
      <AlertDialog open={!!teamMemberToRemove} onOpenChange={() => setTeamMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xs">Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to remove {teamMemberToRemove?.profile?.first_name || teamMemberToRemove?.profile?.email || 'this member'} from the site team?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs text-destructive hover:bg-destructive/10"
              onClick={handleRemoveTeamMember}
              disabled={isRemovingMember}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
