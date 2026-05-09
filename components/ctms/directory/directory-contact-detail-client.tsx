'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CalendarClock,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  Info,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  ShieldAlert,
  Trash2,
  User,
  Users,
} from 'lucide-react';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  updateDirectoryContact,
  removeContactStudyLink,
  upsertContactStudyLink,
  removeContactSiteLink,
  removeContactInstitutionLink,
  setDirectoryContactStatus,
} from '@/lib/actions/directory-contacts';
import { removeCommitteeMember } from '@/lib/actions/directory-committees';
import { directoryContactDetailFormSchema } from '@/lib/validation/directory';
import { DirectoryCountryRegionFields } from '@/components/ctms/directory/directory-country-region-fields';
import { DirectoryContactPhotoField } from '@/components/ctms/directory/directory-contact-photo-field';
import {
  ContactAddAssignmentDialog,
  type AddAssignmentInitialTab,
} from '@/components/ctms/directory/contact-add-assignment-dialog';
import type { DirectoryAssignmentOpenEntry } from '@/lib/directory/contact-assignment-analytics';
import {
  ContactQuickAddCommitteeSheet,
  ContactQuickAddOrgSheet,
  ContactQuickAddSiteSheet,
  ContactQuickAddStudySheet,
} from '@/components/ctms/directory/contact-quick-add-dialogs';
import { formatPhoneNumber, cn } from '@/lib/utils';
import { getCountryName } from '@/lib/data/countries';
import { resolveContactAddress } from '@/lib/directory/contact-address';
import type { CommitteeRow, DirectoryContactWithRelations } from '@/lib/types/directory';
import type { Study, StudySiteWithStudy } from '@/lib/types/ctms';
import type { InstitutionRow } from '@/lib/types/directory';
import { getOrganizationTypeLabel } from '@/components/ctms/directory/institution-profile/utils';

type ContactDetailFormInput = z.input<typeof directoryContactDetailFormSchema>;
type ContactDetailFormOutput = z.infer<typeof directoryContactDetailFormSchema>;

type CatalogCat = {
  id: string;
  code: string;
  name: string;
  sort_order?: number;
  roles: { id: string; name: string }[];
};

interface Props {
  companyId: string;
  contact: DirectoryContactWithRelations;
  canEdit: boolean;
  catalog: CatalogCat[];
  /** When set, directory role catalog fetch failed. */
  catalogError?: string | null;
  studies: Study[];
  sites: StudySiteWithStudy[];
  institutions: InstitutionRow[];
  /** Company committees for linking this contact as a member. */
  committees: CommitteeRow[];
  /** `searchParams.from` when opened from a study Directory — used for linkage messaging. */
  directoryContextStudyId?: string | null;
}

type StudyLinkRow = DirectoryContactWithRelations['studies'][number];
type SiteLinkRow = DirectoryContactWithRelations['sites'][number];
type InstLinkRow = DirectoryContactWithRelations['institutions'][number];
type CommitteeLinkRow = DirectoryContactWithRelations['committees'][number];

/** Normalize possibly-array Supabase relations to a single record. */
function singleStudy(s: unknown) {
  return (Array.isArray(s) ? s[0] : s) as
    | { id?: string; title?: string; protocol_number?: string }
    | null;
}
function singleSite(s: unknown) {
  return (Array.isArray(s) ? s[0] : s) as
    | { site_number?: string; name?: string; studies?: unknown }
    | null;
}
function singleInst(i: unknown) {
  return (Array.isArray(i) ? i[0] : i) as Pick<InstitutionRow, 'id' | 'name' | 'organization_type'> | null;
}
function singleComm(c: unknown) {
  return (Array.isArray(c) ? c[0] : c) as { name?: string } | null;
}
function singleRole(r: unknown) {
  return (Array.isArray(r) ? r[0] : r) as { name?: string } | null;
}

function studyLabel(s: { study_name?: string | null; protocol_number: string; title: string } | null | undefined) {
  if (!s) return 'this study';
  return s.study_name?.trim() || s.title?.trim() || s.protocol_number?.trim() || 'this study';
}

/** ISO timestamps formatted for display. Uses date-fns (not `toLocale*`) so SSR and the browser match. */
function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return format(d, 'MMM dd, yyyy');
  } catch {
    return '—';
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return format(d, 'MMM dd, yyyy h:mm a');
  } catch {
    return '—';
  }
}

function shortId(id: string): string {
  if (!id) return '—';
  return id.slice(0, 8).toUpperCase();
}

function initials(first: string, last: string): string {
  const f = first?.trim()?.[0] ?? '';
  const l = last?.trim()?.[0] ?? '';
  return `${f}${l}`.toUpperCase() || 'U';
}

interface CompletenessCheck {
  id: 'role' | 'study' | 'site' | 'org' | 'contact';
  label: string;
  done: boolean;
}

function hasAnyAssignmentRole(contact: DirectoryContactWithRelations): boolean {
  return (
    contact.studies.some((s) => s.directory_roles?.id) ||
    contact.sites.some((s) => s.directory_roles?.id)
  );
}

function hasPrimaryInstitution(contact: DirectoryContactWithRelations): boolean {
  return contact.institutions.some((i) => i.is_primary);
}

function getCompleteness(contact: DirectoryContactWithRelations): CompletenessCheck[] {
  return [
    { id: 'role', label: 'Role assigned', done: hasAnyAssignmentRole(contact) },
    { id: 'study', label: 'Study linked', done: contact.studies.length > 0 },
    { id: 'site', label: 'Site linked', done: contact.sites.length > 0 },
    { id: 'org', label: 'Organization linked', done: hasPrimaryInstitution(contact) },
    { id: 'contact', label: 'Contact info present', done: !!contact.email || !!contact.phone },
  ];
}

const COMPLETENESS_SCROLL_IDS: Record<CompletenessCheck['id'], string> = {
  role: 'contact-study-assignments',
  study: 'contact-study-assignments',
  site: 'contact-site-assignments',
  org: 'contact-organizations',
  contact: 'contact-profile-card',
};

interface AttentionItem {
  id: string;
  icon: typeof AlertTriangle;
  iconClass: string;
  title: string;
  description: string;
  ctaLabel?: string;
  onAction?: () => void;
}

function getAttentionItems(
  contact: DirectoryContactWithRelations,
  contextStudyId: string | null | undefined,
  isLinkedToContext: boolean,
  contextLabel: string | null,
  actions: {
    editProfile: () => void;
    openAddAssignmentForAttention: (tab: AddAssignmentInitialTab) => void;
  }
): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (!hasAnyAssignmentRole(contact)) {
    items.push({
      id: 'no-role',
      icon: ShieldAlert,
      iconClass: 'text-amber-500',
      title: 'No assignment has a role',
      description: 'Add a role to at least one study or site assignment.',
      ctaLabel: 'Add assignment',
      onAction: () => actions.openAddAssignmentForAttention('studies'),
    });
  }
  if (contact.sites.length === 0) {
    items.push({
      id: 'no-site',
      icon: Building2,
      iconClass: 'text-orange-500',
      title: 'Not assigned to any site',
      description: 'Assign to a site to enable visit tracking.',
      ctaLabel: 'Add assignment',
      onAction: () => actions.openAddAssignmentForAttention('sites'),
    });
  }
  if (contextStudyId && contextLabel && !isLinkedToContext) {
    items.push({
      id: 'no-context-study',
      icon: AlertTriangle,
      iconClass: 'text-amber-500',
      title: `Not linked to ${contextLabel}`,
      description: 'Profile will not appear on the study Directory list until linked.',
      ctaLabel: 'Add assignment',
      onAction: () => actions.openAddAssignmentForAttention('studies'),
    });
  }
  if (contact.studies.length === 0) {
    items.push({
      id: 'no-study',
      icon: Info,
      iconClass: 'text-sky-500',
      title: 'No study links',
      description: 'Link this person to one or more studies.',
      ctaLabel: 'Add assignment',
      onAction: () => actions.openAddAssignmentForAttention('studies'),
    });
  }
  if (!hasPrimaryInstitution(contact)) {
    items.push({
      id: 'no-org',
      icon: Building2,
      iconClass: 'text-amber-500',
      title: 'No primary organization',
      description: 'Mark one organization as primary for this contact.',
      ctaLabel: 'Add assignment',
      onAction: () => actions.openAddAssignmentForAttention('org'),
    });
  }
  if (contact.status === 'inactive') {
    items.push({
      id: 'inactive',
      icon: AlertCircle,
      iconClass: 'text-red-500',
      title: 'Contact is inactive',
      description: 'Inactive contacts are hidden from active study lists.',
    });
  }
  return items;
}

export function DirectoryContactDetailClient({
  companyId,
  contact: initial,
  canEdit,
  catalog,
  catalogError = null,
  studies,
  sites,
  institutions,
  committees,
  directoryContextStudyId = null,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [contact, setContact] = useState(initial);
  const [editingProfile, setEditingProfile] = useState(false);
  const addressStaleToastKey = useRef<string | null>(null);

  useEffect(() => {
    const key = `${contact.id}:${contact.updated_at}`;
    if (addressStaleToastKey.current === key) return;
    if (contact.contact_address_source !== 'site') return;
    const r = resolveContactAddress(contact);
    if (!r.staleOrMissingSite) return;
    addressStaleToastKey.current = key;
    toast.message(
      'Site address could not be resolved from assignments. Edit the profile to pick a site or use a manual address.'
    );
  }, [contact]);

  const flatRoles = catalog.flatMap((c) => c.roles);
  const roleLibraryReady = catalog.some((c) => (c.roles?.length ?? 0) > 0);

  const derivedRoleId = useMemo(() => {
    for (const study of contact.studies) {
      if (study.directory_roles?.id) return study.directory_roles.id;
    }
    for (const site of contact.sites) {
      if (site.directory_roles?.id) return site.directory_roles.id;
    }
    return null;
  }, [contact.studies, contact.sites]);

  const form = useForm<ContactDetailFormInput, unknown, ContactDetailFormOutput>({
    resolver: zodResolver(directoryContactDetailFormSchema),
    defaultValues: {
      first_name: initial.first_name,
      last_name: initial.last_name,
      title: initial.title ?? '',
      email: initial.email ?? '',
      avatar_url: initial.avatar_url ?? '',
      phone: formatPhoneNumber(initial.phone ?? ''),
      department: initial.department ?? '',
      country_code: initial.country_code ?? '',
      region: initial.region ?? '',
      address_line1: initial.address_line1 ?? '',
      city: initial.city ?? '',
      postal_code: initial.postal_code ?? '',
      contact_address_source: initial.contact_address_source ?? 'manual',
      contact_address_study_site_id: initial.contact_address_study_site_id ?? '',
      status: initial.status,
      notes: initial.notes ?? '',
      secondary_role_ids: initial.secondary_roles.map((r) => r.id),
    },
  });

  const [studyRoleEditRow, setStudyRoleEditRow] = useState<StudyLinkRow | null>(null);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentInitialTab, setAssignmentInitialTab] = useState<AddAssignmentInitialTab>('studies');
  const [assignmentAnalyticsEntry, setAssignmentAnalyticsEntry] =
    useState<DirectoryAssignmentOpenEntry>('completeness');
  const [quickStudyOpen, setQuickStudyOpen] = useState(false);
  const [quickSiteOpen, setQuickSiteOpen] = useState(false);
  const [quickOrgOpen, setQuickOrgOpen] = useState(false);
  const [quickCommitteeOpen, setQuickCommitteeOpen] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setContact(initial);
    });
  }, [initial.id, initial.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps -- intentional subset of `initial`

  const resetForm = useCallback(() => {
    form.reset({
      first_name: contact.first_name,
      last_name: contact.last_name,
      title: contact.title ?? '',
      email: contact.email ?? '',
      avatar_url: contact.avatar_url ?? '',
      phone: formatPhoneNumber(contact.phone ?? ''),
      department: contact.department ?? '',
      country_code: contact.country_code ?? '',
      region: contact.region ?? '',
      address_line1: contact.address_line1 ?? '',
      city: contact.city ?? '',
      postal_code: contact.postal_code ?? '',
      contact_address_source: contact.contact_address_source ?? 'manual',
      contact_address_study_site_id: contact.contact_address_study_site_id ?? '',
      status: contact.status,
      notes: contact.notes ?? '',
      secondary_role_ids: contact.secondary_roles.map((r) => r.id),
    });
  }, [contact, form]);

  const enterEdit = useCallback(() => {
    if (!canEdit) return;
    resetForm();
    setEditingProfile(true);
  }, [canEdit, resetForm]);

  const cancelEdit = useCallback(() => {
    resetForm();
    setEditingProfile(false);
  }, [resetForm]);

  const onSave = form.handleSubmit(async (values) => {
    startTransition(async () => {
      const res = await updateDirectoryContact(contact.id, {
        ...values,
        profile_id: contact.profile_id,
        title: values.title || undefined,
        email: values.email || undefined,
        avatar_url: values.avatar_url?.trim() || null,
        phone: values.phone || undefined,
        department: values.department || undefined,
        country_code: values.country_code || undefined,
        region: values.region || undefined,
        notes: values.notes || undefined,
        address_line1: values.address_line1,
        city: values.city,
        postal_code: values.postal_code,
        contact_address_source: values.contact_address_source,
        contact_address_study_site_id: values.contact_address_study_site_id,
      });
      if (res.error) toast.error(res.error);
      else {
        toast.success('Contact updated');
        if (res.duplicateEmailWarning) toast.message('Another contact shares this email.');
        setContact((c) => ({
          ...c,
          first_name: values.first_name,
          last_name: values.last_name,
          title: values.title || null,
          email: values.email || null,
          avatar_url: values.avatar_url?.trim() || null,
          phone: values.phone || null,
          department: values.department || null,
          country_code: values.country_code || null,
          region: values.region || null,
          status: values.status,
          notes: values.notes || null,
          address_line1: values.address_line1?.trim() ? values.address_line1.trim() : null,
          city: values.city?.trim() ? values.city.trim() : null,
          postal_code: values.postal_code?.trim() ? values.postal_code.trim() : null,
          contact_address_source: values.contact_address_source,
          contact_address_study_site_id: values.contact_address_study_site_id ?? null,
        }));
        setEditingProfile(false);
        router.refresh();
      }
    });
  });

  const contextStudyLabel = useMemo(() => {
    if (!directoryContextStudyId) return null;
    const s = studies.find((x) => x.id === directoryContextStudyId);
    if (!s) return 'this study';
    return studyLabel(s);
  }, [directoryContextStudyId, studies]);

  const isLinkedToContextStudy = Boolean(
    directoryContextStudyId &&
      contact.studies.some((row) => row.study_id === directoryContextStudyId)
  );

  const completeness = useMemo(() => getCompleteness(contact), [contact]);
  const completenessRatio = useMemo(() => {
    const done = completeness.filter((c) => c.done).length;
    return { done, total: completeness.length };
  }, [completeness]);

  const scrollToCompletenessSection = useCallback((id: CompletenessCheck['id']) => {
    const domId = COMPLETENESS_SCROLL_IDS[id];
    const el = typeof document !== 'undefined' ? document.getElementById(domId) : null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const openAddAssignment = useCallback(
    (tab: AddAssignmentInitialTab, analyticsEntry: DirectoryAssignmentOpenEntry = 'completeness') => {
      if (!canEdit) {
        toast.message('You do not have permission to edit assignments.');
        return;
      }
      setAssignmentAnalyticsEntry(analyticsEntry);
      setAssignmentInitialTab(tab);
      setAssignmentOpen(true);
    },
    [canEdit]
  );

  const handleCompletenessRowClick = useCallback(
    (id: CompletenessCheck['id']) => {
      const row = completeness.find((c) => c.id === id);
      if (!row) return;
      if (!row.done) {
        if (id === 'contact') {
          if (!canEdit) {
            toast.message('You do not have permission to edit this profile.');
            return;
          }
          enterEdit();
          setTimeout(() => {
            document.getElementById('contact-profile-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
          return;
        }
        if (id === 'role' || id === 'study') {
          openAddAssignment('studies', 'completeness');
          return;
        }
        if (id === 'site') {
          openAddAssignment('sites', 'completeness');
          return;
        }
        if (id === 'org') {
          openAddAssignment('org', 'completeness');
          return;
        }
      }
      scrollToCompletenessSection(id);
    },
    [completeness, canEdit, enterEdit, openAddAssignment, scrollToCompletenessSection]
  );

  const actions = useMemo(
    () => ({
      editProfile: () => {
        if (!canEdit) {
          toast.message('You do not have permission to edit this profile.');
          return;
        }
        enterEdit();
        setTimeout(() => {
          const el = document.getElementById('contact-profile-card');
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      },
      openAddAssignment,
      openQuickAddStudy: () => {
        if (!canEdit) {
          toast.message('You do not have permission to add study links.');
          return;
        }
        setQuickStudyOpen(true);
      },
      openQuickAddSite: () => {
        if (!canEdit) {
          toast.message('You do not have permission to add site links.');
          return;
        }
        setQuickSiteOpen(true);
      },
      openQuickAddOrg: () => {
        if (!canEdit) {
          toast.message('You do not have permission to add organization links.');
          return;
        }
        setQuickOrgOpen(true);
      },
      openQuickAddCommittee: () => {
        if (!canEdit) {
          toast.message('You do not have permission to edit committee memberships.');
          return;
        }
        setQuickCommitteeOpen(true);
      },
      openStudyRoleEdit: (row: StudyLinkRow) => {
        if (!canEdit) {
          toast.message('You do not have permission to edit study links.');
          return;
        }
        setStudyRoleEditRow(row);
      },
    }),
    [canEdit, enterEdit, openAddAssignment]
  );

  const attentionActions = useMemo(
    () => ({
      editProfile: actions.editProfile,
      openAddAssignmentForAttention: (tab: AddAssignmentInitialTab) => openAddAssignment(tab, 'attention'),
    }),
    [actions.editProfile, openAddAssignment]
  );

  const attention = useMemo(
    () =>
      getAttentionItems(
        contact,
        directoryContextStudyId,
        isLinkedToContextStudy,
        contextStudyLabel,
        attentionActions
      ),
    [contact, directoryContextStudyId, isLinkedToContextStudy, contextStudyLabel, attentionActions]
  );

  return (
    <TooltipProvider delay={200}>
      <div className="space-y-4">
        <ContactHeroCard
          contact={contact}
          canEdit={canEdit}
          completenessRatio={completenessRatio}
          onToggleStatus={() => {
            startTransition(async () => {
              const next = contact.status === 'active' ? 'inactive' : 'active';
              const { error } = await setDirectoryContactStatus(contact.id, next);
              if (error) toast.error(error);
              else {
                toast.success(next === 'active' ? 'Activated' : 'Deactivated');
                setContact((c) => ({ ...c, status: next }));
                router.refresh();
              }
            });
          }}
          onEditProfile={actions.editProfile}
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 items-start">
          <div className="min-w-0 space-y-4">
            <ProfileInformationCard
              companyId={companyId}
              contact={contact}
              canEdit={canEdit}
              editing={editingProfile}
              onEdit={enterEdit}
              onCancel={cancelEdit}
              onSave={onSave}
              form={form}
              catalog={catalog}
              catalogError={catalogError}
              roleLibraryReady={roleLibraryReady}
              institutions={institutions}
            />

            <StudyAssignmentsTable
              rows={contact.studies}
              canEdit={canEdit}
              onQuickAdd={actions.openQuickAddStudy}
              onEditRole={(row) => actions.openStudyRoleEdit(row)}
              onRemove={(id) =>
                startTransition(async () => {
                  await removeContactStudyLink(id);
                  toast.success('Removed');
                  router.refresh();
                })
              }
            />

            <SiteAssignmentsTable
              rows={contact.sites}
              canEdit={canEdit}
              onQuickAdd={actions.openQuickAddSite}
              onRemove={(id) =>
                startTransition(async () => {
                  await removeContactSiteLink(id);
                  toast.success('Removed');
                  router.refresh();
                })
              }
            />

            <OrganizationsTable
              rows={contact.institutions}
              canEdit={canEdit}
              onQuickAdd={actions.openQuickAddOrg}
              onRemove={(id) =>
                startTransition(async () => {
                  await removeContactInstitutionLink(id);
                  toast.success('Removed');
                  router.refresh();
                })
              }
            />

            <CommitteeMembershipsTable
              rows={contact.committees}
              canEdit={canEdit}
              onQuickAdd={actions.openQuickAddCommittee}
              onRemove={(id) =>
                startTransition(async () => {
                  const { error } = await removeCommitteeMember(id);
                  if (error) toast.error(error);
                  else {
                    toast.success('Removed from committee');
                    router.refresh();
                  }
                })
              }
            />
          </div>

          <ContactRightRail
            contact={contact}
            attention={attention}
            completeness={completeness}
            onCompletenessRowClick={handleCompletenessRowClick}
          />
        </div>

        <StudyLinkRoleDialog
          open={studyRoleEditRow !== null}
          onOpenChange={(v) => {
            if (!v) setStudyRoleEditRow(null);
          }}
          row={studyRoleEditRow}
          contactId={contact.id}
          studies={studies}
          roles={flatRoles}
          onDone={() => {
            setStudyRoleEditRow(null);
            router.refresh();
          }}
        />
        <ContactAddAssignmentDialog
          open={assignmentOpen}
          onOpenChange={setAssignmentOpen}
          contact={contact}
          studies={studies}
          sites={sites}
          institutions={institutions}
          committees={committees}
          roles={flatRoles}
          catalog={catalog}
          existingStudyIds={new Set(contact.studies.map((s) => s.study_id))}
          existingSiteIds={new Set(contact.sites.map((s) => s.study_site_id))}
          existingInstIds={new Set(contact.institutions.map((i) => i.institution_id))}
          existingCommitteeIds={new Set(contact.committees.map((c) => c.committee_id))}
          initialTab={assignmentInitialTab}
          analyticsEntry={assignmentAnalyticsEntry}
          onSuccess={() => router.refresh()}
        />
        <ContactQuickAddStudySheet
          open={quickStudyOpen}
          onOpenChange={setQuickStudyOpen}
          contactId={contact.id}
          studies={studies}
          roles={flatRoles}
          existingStudyIds={new Set(contact.studies.map((s) => s.study_id))}
          defaultDirectoryRoleId={derivedRoleId}
          onDone={() => router.refresh()}
        />
        <ContactQuickAddSiteSheet
          open={quickSiteOpen}
          onOpenChange={setQuickSiteOpen}
          contactId={contact.id}
          sites={sites}
          roles={flatRoles}
          existingSiteIds={new Set(contact.sites.map((s) => s.study_site_id))}
          defaultDirectoryRoleId={derivedRoleId}
          onDone={() => router.refresh()}
        />
        <ContactQuickAddOrgSheet
          open={quickOrgOpen}
          onOpenChange={setQuickOrgOpen}
          contactId={contact.id}
          institutions={institutions}
          existingInstIds={new Set(contact.institutions.map((i) => i.institution_id))}
          onDone={() => router.refresh()}
        />
        <ContactQuickAddCommitteeSheet
          open={quickCommitteeOpen}
          onOpenChange={setQuickCommitteeOpen}
          contactId={contact.id}
          committees={committees}
          roles={flatRoles}
          existingCommitteeIds={new Set(contact.committees.map((c) => c.committee_id))}
          defaultDirectoryRoleId={derivedRoleId}
          onDone={() => router.refresh()}
        />
      </div>
    </TooltipProvider>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */

function ContactHeroCard({
  contact,
  canEdit,
  completenessRatio,
  onToggleStatus,
  onEditProfile,
}: {
  contact: DirectoryContactWithRelations;
  canEdit: boolean;
  completenessRatio: { done: number; total: number };
  onToggleStatus: () => void;
  onEditProfile: () => void;
}) {
  const isActive = contact.status === 'active';
  return (
    <Card>
      <CardContent className="px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <div className="relative">
              <Avatar className="h-20 w-20 shrink-0 rounded-full border border-border">
                <AvatarImage src={contact.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="rounded-full bg-orange-100 text-orange-700 text-lg font-semibold">
                  {initials(contact.first_name, contact.last_name)}
                </AvatarFallback>
              </Avatar>
              {canEdit && (
                <button
                  type="button"
                  onClick={onEditProfile}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:text-foreground"
                  aria-label="Change photo"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight truncate">
                  {contact.first_name} {contact.last_name}
                </h1>
                <Badge
                  variant={isActive ? 'success' : 'secondary'}
                  className="text-[10px] uppercase tracking-wide"
                >
                  {isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {contact.email || '—'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {contact.phone || '—'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[11px] text-muted-foreground">
                <HeroMeta label="User since" value={formatDate(contact.created_at)} />
                <HeroMeta label="Last updated" value={formatDate(contact.updated_at)} />
                <HeroMeta label="User ID" value={`USR-${shortId(contact.id)}`} />
                <HeroMeta
                  label="Profile completeness"
                  value={`${completenessRatio.done}/${completenessRatio.total}`}
                />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {canEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  'text-xs',
                  isActive && 'text-destructive hover:text-destructive border-destructive/30'
                )}
                onClick={onToggleStatus}
              >
                {isActive ? 'Deactivate User' : 'Activate User'}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    if (contact.email) {
                      void navigator.clipboard?.writeText(contact.email);
                      toast.success('Email copied');
                    } else {
                      toast.message('No email on file.');
                    }
                  }}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Copy email
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (contact.phone) {
                      void navigator.clipboard?.writeText(contact.phone);
                      toast.success('Phone copied');
                    } else {
                      toast.message('No phone on file.');
                    }
                  }}
                >
                  <Phone className="h-3.5 w-3.5" />
                  Copy phone
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEditProfile} disabled={!canEdit}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit profile
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HeroMeta({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-medium text-foreground/80">{label}</span>
      <span>{value}</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Profile information (display + edit modes)                                  */
/* -------------------------------------------------------------------------- */

function DirectoryCardSectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <CardTitle className="text-sm font-semibold flex items-center gap-1.5 min-w-0">
      <span>{title}</span>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`About ${title}`}
            />
          }
        >
          <Info className="h-3.5 w-3.5" strokeWidth={2} />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-left leading-snug">
          {description}
        </TooltipContent>
      </Tooltip>
    </CardTitle>
  );
}

interface ProfileFormProps {
  companyId: string;
  contact: DirectoryContactWithRelations;
  canEdit: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (e?: React.BaseSyntheticEvent) => Promise<void>;
  form: ReturnType<typeof useForm<ContactDetailFormInput, unknown, ContactDetailFormOutput>>;
  catalog: CatalogCat[];
  catalogError: string | null;
  roleLibraryReady: boolean;
  institutions: InstitutionRow[];
}

function ProfileInformationCard(props: ProfileFormProps) {
  const { contact, canEdit, editing, onEdit, onCancel, form } = props;

  return (
    <Card id="contact-profile-card" className="scroll-mt-20">
      <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-3">
        <DirectoryCardSectionTitle
          title="Profile Information"
          description="Core directory fields for this person: name, contact details, primary library role, status, and primary organization—used across your company directory."
        />
        {canEdit && !editing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={onEdit}
          >
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={onCancel}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="contact-profile-form"
              size="sm"
              className="text-xs"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {editing ? <ProfileEditForm {...props} /> : <ProfileDisplay contact={contact} />}
      </CardContent>
    </Card>
  );
}

function siteStudySitesCell(
  row: DirectoryContactWithRelations['sites'][number]
): DirectoryContactWithRelations['sites'][number]['study_sites'] {
  const s = row.study_sites;
  if (s == null) return null;
  return Array.isArray(s) ? (s[0] ?? null) : s;
}

function siteAssignmentAddressOptionLabel(row: DirectoryContactWithRelations['sites'][number]): string {
  const ss = siteStudySitesCell(row);
  if (!ss) return `${row.study_site_id.slice(0, 8)}…`;
  const studies = ss.studies;
  const st =
    studies == null ? null : Array.isArray(studies) ? (studies[0] ?? null) : studies;
  const protocol = st?.protocol_number?.trim() ?? '';
  const title = st?.title?.trim() ?? '';
  const studyPart = protocol || title ? ` (${protocol || title})` : '';
  const num = ss.site_number?.trim() ?? '';
  const name = ss.name?.trim() ?? '';
  const left = [num, name].filter(Boolean).join(' — ');
  return `${left || 'Site'}${studyPart}`;
}

function ProfileDisplay({ contact }: { contact: DirectoryContactWithRelations }) {
  const primaryRole = contact.primary_role?.name;
  const org = contact.primary_institution?.name;
  const resolved = resolveContactAddress(contact);
  const countryDisplay =
    getCountryName(resolved.countryCode) ?? resolved.countryCode ?? null;
  const siteRow =
    resolved.source === 'site' && contact.contact_address_study_site_id
      ? contact.sites.find((s) => s.study_site_id === contact.contact_address_study_site_id)
      : undefined;
  const linkedSiteLabel = siteRow ? siteAssignmentAddressOptionLabel(siteRow) : null;

  return (
    <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      <DisplayField label="First Name" value={contact.first_name} />
      <DisplayField label="Last Name" value={contact.last_name} />
      <DisplayField label="Title" value={contact.title} />
      <DisplayField label="Email" value={contact.email} />
      <DisplayField label="Phone" value={contact.phone} />
      <DisplayField
        label="Primary Role (Library)"
        value={
          primaryRole ? (
            <Badge variant="info" className="text-[10px]">
              {primaryRole}
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-[10px]">
              Not Assigned
            </Badge>
          )
        }
      />
      <DisplayField label="Primary Organization" value={org} />
      <DisplayField
        label="Address source"
        value={
          resolved.source === 'site' ? (
            <span className="text-xs">Site assignment address</span>
          ) : (
            <span className="text-xs">Manual address</span>
          )
        }
      />
      {resolved.source === 'site' && linkedSiteLabel ? (
        <DisplayField label="Linked site" value={linkedSiteLabel} />
      ) : null}
      {resolved.staleOrMissingSite && contact.contact_address_source === 'site' ? (
        <div className="sm:col-span-2 lg:col-span-3">
          <Alert variant="destructive" className="py-2">
            <AlertTitle className="text-xs">Site address unavailable</AlertTitle>
            <AlertDescription className="text-xs">
              This contact is set to use a site assignment address, but that site is not linked or
              could not be loaded. Edit the profile to pick a valid site or switch to manual entry.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
      <DisplayField label="Street address" value={resolved.addressLine1} />
      <DisplayField label="City" value={resolved.city} />
      <DisplayField label="Postal code" value={resolved.postalCode} />
      <DisplayField label="Country" value={countryDisplay} />
      <DisplayField label="Region / State" value={resolved.region} />
      <DisplayField
        label="Status"
        value={
          <Badge
            variant={contact.status === 'active' ? 'success' : 'secondary'}
            className="text-[10px]"
          >
            {contact.status === 'active' ? 'Active' : 'Inactive'}
          </Badge>
        }
      />
      <div className="sm:col-span-2 lg:col-span-3">
        <DisplayField label="Notes" value={contact.notes} multiline />
      </div>
    </div>
  );
}

function DisplayField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: ReactNode;
  multiline?: boolean;
}) {
  const empty = value == null || value === '';
  return (
    <div className="space-y-1 min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div
        className={cn(
          'text-xs text-foreground',
          multiline ? 'whitespace-pre-wrap break-words' : 'truncate'
        )}
      >
        {empty ? <span className="text-muted-foreground">—</span> : value}
      </div>
    </div>
  );
}

function ContactMailingAddressFields({
  form,
  contact,
  canEdit,
  addressSource,
  addressSiteId,
}: {
  form: ProfileFormProps['form'];
  contact: DirectoryContactWithRelations;
  canEdit: boolean;
  addressSource: 'manual' | 'site';
  addressSiteId: string | null;
}) {
  const siteAssignments = contact.sites;
  const noSites = siteAssignments.length === 0;

  const previewContact = useMemo(
    () => ({
      ...contact,
      contact_address_source: addressSource,
      contact_address_study_site_id: addressSiteId,
    }),
    [contact, addressSource, addressSiteId]
  );
  const preview = useMemo(() => resolveContactAddress(previewContact), [previewContact]);

  useEffect(() => {
    if (addressSource !== 'site' || !addressSiteId) return;
    const r = resolveContactAddress({
      ...contact,
      contact_address_source: 'site',
      contact_address_study_site_id: addressSiteId,
    });
    if (r.staleOrMissingSite) return;
    const cc = r.countryCode ?? '';
    const rg = r.region ?? '';
    if (form.getValues('country_code') !== cc) {
      form.setValue('country_code', cc, { shouldDirty: true });
    }
    if (form.getValues('region') !== rg) {
      form.setValue('region', rg, { shouldDirty: true });
    }
  }, [addressSource, addressSiteId, contact, form]);

  return (
    <div className="space-y-3 rounded-md border border-input bg-muted/15 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Mailing address
      </p>
      <RadioGroup
        value={addressSource}
        onValueChange={(v) => {
          const next = v as 'manual' | 'site';
          if (next === 'site' && noSites) return;
          if (next === 'manual') {
            const r = resolveContactAddress({
              ...contact,
              contact_address_source: 'site',
              contact_address_study_site_id: form.getValues('contact_address_study_site_id') as
                | string
                | null,
            });
            form.setValue('contact_address_source', 'manual', { shouldDirty: true });
            form.setValue('address_line1', r.addressLine1 ?? '', { shouldDirty: true });
            form.setValue('city', r.city ?? '', { shouldDirty: true });
            form.setValue('postal_code', r.postalCode ?? '', { shouldDirty: true });
            form.setValue('country_code', r.countryCode ?? '', { shouldDirty: true });
            form.setValue('region', r.region ?? '', { shouldDirty: true });
            form.setValue('contact_address_study_site_id', '', { shouldDirty: true });
          } else {
            form.setValue('contact_address_source', 'site', { shouldDirty: true });
            const current = form.getValues('contact_address_study_site_id') as string | null | '';
            const currentStr = current === '' || current == null ? null : current;
            const ok =
              currentStr && siteAssignments.some((s) => s.study_site_id === currentStr);
            if (!ok) {
              if (siteAssignments.length === 1) {
                form.setValue(
                  'contact_address_study_site_id',
                  siteAssignments[0].study_site_id,
                  { shouldDirty: true }
                );
              } else {
                form.setValue('contact_address_study_site_id', '', { shouldDirty: true });
              }
            }
          }
        }}
        className="gap-3"
      >
        <div className="flex items-start gap-2">
          <RadioGroupItem value="manual" id="contact-addr-manual" disabled={!canEdit} />
          <div className="min-w-0 space-y-0.5">
            <Label htmlFor="contact-addr-manual" className="cursor-pointer text-xs font-normal">
              Manual address
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Enter street, city, postal code, and country or region below.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <RadioGroupItem value="site" id="contact-addr-site" disabled={!canEdit || noSites} />
          <div className="min-w-0 space-y-0.5">
            <Label htmlFor="contact-addr-site" className="cursor-pointer text-xs font-normal">
              Use site assignment address
            </Label>
            <p className="text-[11px] text-muted-foreground">
              {noSites
                ? 'Add at least one site assignment to use a study site’s address.'
                : 'Country and region follow the selected site; they update when you change the site.'}
            </p>
          </div>
        </div>
      </RadioGroup>

      {addressSource === 'manual' ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Street address</Label>
            <Input
              className="text-xs h-9"
              disabled={!canEdit}
              {...form.register('address_line1')}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">City</Label>
            <Input className="text-xs h-9" disabled={!canEdit} {...form.register('city')} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Postal code</Label>
            <Input className="text-xs h-9" disabled={!canEdit} {...form.register('postal_code')} />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Site assignment</Label>
            <select
              className="flex h-9 w-full max-w-full rounded-md border border-input bg-background px-2 text-xs disabled:opacity-50 sm:max-w-md"
              disabled={!canEdit}
              value={addressSiteId ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                form.setValue('contact_address_study_site_id', v === '' ? '' : v, {
                  shouldDirty: true,
                });
              }}
            >
              <option value="">Select site…</option>
              {siteAssignments.map((row) => (
                <option key={row.id} value={row.study_site_id}>
                  {siteAssignmentAddressOptionLabel(row)}
                </option>
              ))}
            </select>
            {form.formState.errors.contact_address_study_site_id ? (
              <p className="text-[11px] text-destructive">
                {form.formState.errors.contact_address_study_site_id.message as string}
              </p>
            ) : null}
          </div>
          {preview.staleOrMissingSite ? (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-xs">
                Selected site is not linked to this contact, or its details could not be loaded. Add
                the site assignment or pick another site.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border border-dashed border-input bg-background px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Preview
              </p>
              <ul className="mt-1 space-y-0.5 text-[11px] text-foreground">
                {[preview.addressLine1, preview.city, preview.postalCode]
                  .filter(Boolean)
                  .map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                <li>
                  {[preview.region, getCountryName(preview.countryCode) ?? preview.countryCode]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileEditForm(props: ProfileFormProps) {
  const {
    companyId,
    contact,
    canEdit,
    onSave,
    form,
    catalog,
    catalogError,
    roleLibraryReady,
    institutions,
  } = props;

  const addressSource =
    (useWatch({ control: form.control, name: 'contact_address_source' }) as
      | 'manual'
      | 'site'
      | undefined) ?? 'manual';
  const addressSiteIdRaw = useWatch({ control: form.control, name: 'contact_address_study_site_id' });
  const addressSiteId =
    addressSiteIdRaw === '' || addressSiteIdRaw == null ? null : addressSiteIdRaw;

  return (
    <form id="contact-profile-form" onSubmit={onSave} className="space-y-3">
      {catalogError ? (
        <Alert variant="destructive" className="text-xs">
          <AlertTitle>Role catalog failed to load</AlertTitle>
          <AlertDescription className="text-xs">
            {catalogError}. See{' '}
            <Link
              href="/protected/directory"
              className="underline underline-offset-2 font-medium"
            >
              Directory &amp; role catalog setup
            </Link>{' '}
            or refresh after signing in.
          </AlertDescription>
        </Alert>
      ) : null}
      {!catalogError && !roleLibraryReady ? (
        <Alert className="text-xs border-amber-500/40 bg-amber-500/5">
          <AlertTitle>Role catalog is empty</AlertTitle>
          <AlertDescription className="text-xs">
            Apply Supabase migrations (role seeds), run{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-[10px]">supabase db push</code>,
            then refresh.{' '}
            <Link
              href="/protected/directory"
              className="underline underline-offset-2 font-medium"
            >
              Directory &amp; role catalog setup
            </Link>
            .
          </AlertDescription>
        </Alert>
      ) : null}
      {canEdit ? (
        <DirectoryContactPhotoField
          companyId={companyId}
          imageUrl={form.watch('avatar_url') ?? ''}
          onImageUrlChange={(url) =>
            form.setValue('avatar_url', url, { shouldDirty: true })
          }
        />
      ) : (
        contact.avatar_url && (
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16 rounded-lg after:rounded-lg border border-border">
              <AvatarImage src={contact.avatar_url} alt="" className="rounded-lg" />
              <AvatarFallback className="rounded-lg">
                <User className="h-7 w-7 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <p className="text-xs text-muted-foreground">Profile photo</p>
          </div>
        )
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">First name</Label>
          <Input className="text-xs h-9" {...form.register('first_name')} disabled={!canEdit} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Last name</Label>
          <Input className="text-xs h-9" {...form.register('last_name')} disabled={!canEdit} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Title</Label>
        <Input className="text-xs h-9" {...form.register('title')} disabled={!canEdit} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Email</Label>
          <Input
            className="text-xs h-9"
            type="email"
            {...form.register('email')}
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Phone</Label>
          <Input
            className="text-xs h-9"
            disabled={!canEdit}
            inputMode="tel"
            autoComplete="tel"
            placeholder="+1 (555) 000-0000"
            value={form.watch('phone') ?? ''}
            onChange={(e) =>
              form.setValue('phone', formatPhoneNumber(e.target.value), { shouldDirty: true })
            }
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Status</Label>
        <select
          className="flex h-9 w-full max-w-full rounded-md border border-input bg-background px-2 text-xs disabled:opacity-50 sm:max-w-md"
          disabled={!canEdit}
          {...form.register('status')}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <ContactMailingAddressFields
        form={form}
        contact={contact}
        canEdit={canEdit}
        addressSource={addressSource}
        addressSiteId={addressSiteId}
      />
      <DirectoryCountryRegionFields
        variant="contactRow"
        countryCode={form.watch('country_code') ?? ''}
        region={form.watch('region') ?? ''}
        onCountryChange={(c) => {
          form.setValue('country_code', c, { shouldDirty: true });
        }}
        onRegionChange={(r) => form.setValue('region', r, { shouldDirty: true })}
        disabled={!canEdit || addressSource === 'site'}
      />
      <div className="space-y-1">
        <Label className="text-xs">Notes</Label>
        <Textarea
          className="text-xs min-h-[72px]"
          {...form.register('notes')}
          disabled={!canEdit}
        />
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Assignment tables                                                           */
/* -------------------------------------------------------------------------- */

const directoryAssignmentsSectionClass =
  'bg-card text-card-foreground flex w-full min-w-0 flex-col overflow-hidden rounded-[5px] border border-input shadow-none';

function StudyAssignmentsTable({
  rows,
  canEdit,
  onQuickAdd,
  onEditRole,
  onRemove,
}: {
  rows: StudyLinkRow[];
  canEdit: boolean;
  onQuickAdd: () => void;
  onEditRole: (row: StudyLinkRow) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section
      id="contact-study-assignments"
      className={cn(directoryAssignmentsSectionClass, 'scroll-mt-20')}
      aria-label="Study assignments"
    >
      <div className="flex flex-row flex-wrap items-start justify-between gap-3 px-4 pt-4 pb-3">
        <DirectoryCardSectionTitle
          title="Study Assignments"
          description="Protocols this contact is linked to and their study-level directory role. Distinct from site assignments and from the primary library role on their profile."
        />
        {canEdit ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={onQuickAdd}>
              <Plus className="mr-1 h-3 w-3" />
              Add
            </Button>
          </div>
        ) : null}
      </div>
      <div className="px-0 pb-2 pt-0">
        {rows.length === 0 ? (
          <EmptySection
            icon={ClipboardList}
            title="No study assignments yet"
            description="Link this contact to one or more studies."
            cta={canEdit ? { label: 'Add Study', onClick: onQuickAdd } : undefined}
            paddedX
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] uppercase">Study</TableHead>
                <TableHead className="text-[10px] uppercase">Role</TableHead>
                <TableHead className="text-[10px] uppercase w-20">Active</TableHead>
                <TableHead className="text-[10px] uppercase w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const st = singleStudy(row.studies);
                const dr = singleRole(row.directory_roles);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs">
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-medium truncate">{st?.protocol_number ?? '—'}</p>
                        {st?.title ? (
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {st.title}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {dr?.name ? (
                        <Badge variant="info" className="text-[10px]">
                          {dr.name}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          No study role
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={cn(
                            'inline-block h-1.5 w-1.5 rounded-full',
                            row.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                          )}
                          aria-hidden
                        />
                        {row.is_active ? 'Yes' : 'No'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {canEdit && (
                        <span className="inline-flex items-center justify-end gap-0.5">
                          <Tooltip>
                            <TooltipTrigger render={<span className="inline-flex" />}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onEditRole(row)}
                                aria-label="Edit study role"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit study role</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger render={<span className="inline-flex" />}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onRemove(row.id)}
                                aria-label="Remove study link"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove study link</TooltipContent>
                          </Tooltip>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}

function SiteAssignmentsTable({
  rows,
  canEdit,
  onQuickAdd,
  onRemove,
}: {
  rows: SiteLinkRow[];
  canEdit: boolean;
  onQuickAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section
      id="contact-site-assignments"
      className={cn(directoryAssignmentsSectionClass, 'scroll-mt-20')}
      aria-label="Site assignments"
    >
      <div className="flex flex-row flex-wrap items-start justify-between gap-3 px-4 pt-4 pb-3">
        <DirectoryCardSectionTitle
          title="Site Assignments"
          description="Study sites (investigator locations) where this contact is assigned. Roles here can reflect responsibilities at a specific site."
        />
        {canEdit ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={onQuickAdd}>
              <Plus className="mr-1 h-3 w-3" />
              Add
            </Button>
          </div>
        ) : null}
      </div>
      <div className="px-0 pb-2 pt-0">
        {rows.length === 0 ? (
          <EmptySection
            icon={Building2}
            title="No site assignments yet"
            description="Assign the user to one or more sites to enable monitoring and tasks."
            cta={canEdit ? { label: 'Assign to Site', onClick: onQuickAdd } : undefined}
            paddedX
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] uppercase">Site</TableHead>
                <TableHead className="text-[10px] uppercase">Study</TableHead>
                <TableHead className="text-[10px] uppercase">Role at Site</TableHead>
                <TableHead className="text-[10px] uppercase w-20">Active</TableHead>
                <TableHead className="text-[10px] uppercase w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const ss = singleSite(row.study_sites);
                const st = singleStudy(ss?.studies);
                const dr = singleRole(row.directory_roles);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs">
                      {ss ? `${ss.site_number} — ${ss.name}` : '—'}
                    </TableCell>
                    <TableCell className="text-xs">{st?.protocol_number ?? '—'}</TableCell>
                    <TableCell className="text-xs">
                      {dr?.name ? (
                        <Badge variant="info" className="text-[10px]">
                          {dr.name}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          —
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={cn(
                            'inline-block h-1.5 w-1.5 rounded-full',
                            row.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                          )}
                          aria-hidden
                        />
                        {row.is_active ? 'Yes' : 'No'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {canEdit && (
                        <Tooltip>
                          <TooltipTrigger render={<span className="inline-flex" />}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onRemove(row.id)}
                              aria-label="Remove site link"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove site link</TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}

function OrganizationsTable({
  rows,
  canEdit,
  onQuickAdd,
  onRemove,
}: {
  rows: InstLinkRow[];
  canEdit: boolean;
  onQuickAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Card id="contact-organizations" className="scroll-mt-20">
      <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-3">
        <DirectoryCardSectionTitle
          title="Organizations"
          description="Institutional affiliations beyond the primary organization on the profile—e.g. sponsor, site, CRO, or partner entities."
        />
        {canEdit && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" className="text-xs h-8" onClick={onQuickAdd}>
              <Plus className="h-3 w-3 mr-1" />
              Add Link
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-0 pb-2 pt-0">
        {rows.length === 0 ? (
          <EmptySection
            icon={Building2}
            title="No organizations linked"
            description="Add organization links if this user is affiliated with any."
            cta={canEdit ? { label: 'Add Link', onClick: onQuickAdd } : undefined}
            paddedX
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] uppercase">Organization</TableHead>
                <TableHead className="text-[10px] uppercase min-w-[7rem]">Type</TableHead>
                <TableHead className="text-[10px] uppercase w-20">Primary</TableHead>
                <TableHead className="text-[10px] uppercase w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const ins = singleInst(row.institutions);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs">{ins?.name ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ins?.organization_type
                        ? getOrganizationTypeLabel(ins.organization_type)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.is_primary ? (
                        <Badge variant="info" className="text-[10px]">
                          Primary
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {canEdit && (
                        <Tooltip>
                          <TooltipTrigger render={<span className="inline-flex" />}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onRemove(row.id)}
                              aria-label="Remove organization link"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove organization link</TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function CommitteeMembershipsTable({
  rows,
  canEdit,
  onQuickAdd,
  onRemove,
}: {
  rows: CommitteeLinkRow[];
  canEdit: boolean;
  onQuickAdd: () => void;
  onRemove: (junctionId: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-3">
        <DirectoryCardSectionTitle
          title="Committee Memberships"
          description="Ethics, DSMB, steering, or other governance committees this contact is recorded on for oversight and compliance."
        />
        {canEdit && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" className="text-xs h-8" onClick={onQuickAdd}>
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-0 pb-2 pt-0">
        {rows.length === 0 ? (
          <EmptySection
            icon={Users}
            title="No committee memberships"
            description="Add this user to committees to participate in governance."
            cta={canEdit ? { label: 'Add to committee', onClick: onQuickAdd } : undefined}
            paddedX
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] uppercase">Committee</TableHead>
                <TableHead className="text-[10px] uppercase">Role</TableHead>
                <TableHead className="text-[10px] uppercase w-20">Active</TableHead>
                <TableHead className="text-[10px] uppercase w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const co = singleComm(row.committees);
                const dr = singleRole(row.directory_roles);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs">{co?.name ?? '—'}</TableCell>
                    <TableCell className="text-xs">{dr?.name ?? '—'}</TableCell>
                    <TableCell className="text-xs">{row.is_active ? 'Yes' : 'No'}</TableCell>
                    <TableCell className="text-xs text-right">
                      {canEdit && (
                        <Tooltip>
                          <TooltipTrigger render={<span className="inline-flex" />}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onRemove(row.id)}
                              aria-label="Remove committee membership"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove from committee</TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Right rail                                                                  */
/* -------------------------------------------------------------------------- */

function completenessRowAriaLabel(c: CompletenessCheck): string {
  const statusWord = c.done ? 'complete' : 'needed';
  const dest =
    c.id === 'contact'
      ? 'profile information'
      : c.id === 'role' || c.id === 'study'
        ? 'study assignments'
        : c.id === 'site'
          ? 'site assignments'
          : 'organizations';
  if (!c.done && (c.id === 'role' || c.id === 'study' || c.id === 'site' || c.id === 'org')) {
    return `Open add assignment for ${c.label}: ${statusWord}`;
  }
  return `Go to ${dest}: ${c.label} is ${statusWord}`;
}

function ContactRightRail({
  contact,
  attention,
  completeness,
  onCompletenessRowClick,
}: {
  contact: DirectoryContactWithRelations;
  attention: AttentionItem[];
  completeness: CompletenessCheck[];
  onCompletenessRowClick: (id: CompletenessCheck['id']) => void;
}) {
  return (
    <div className="space-y-4 lg:sticky lg:top-20" aria-label="Contact insights">
      <Card className="py-0">
        <CardHeader className="px-4 pt-3 pb-2">
          <CardTitle className="flex items-center justify-between text-sm font-medium">
            <span>Needs Attention</span>
            {attention.length > 0 ? (
              <Badge variant="destructive" className="text-[10px] px-1.5">
                {attention.length}
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3 pt-0 space-y-1">
          {attention.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              Nothing needs attention right now.
            </p>
          ) : (
            attention.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 rounded-md px-2 py-2 hover:bg-muted/40"
              >
                <item.icon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', item.iconClass)} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground leading-tight">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {item.description}
                  </p>
                  {item.ctaLabel && item.onAction ? (
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 mt-1 text-[11px] text-sky-600 dark:text-sky-400"
                      onClick={item.onAction}
                    >
                      {item.ctaLabel}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="px-4 pt-3 pb-2">
          <CardTitle className="text-sm font-medium">Profile Completeness</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3 pt-0 space-y-1">
          {completeness.map((c) => (
            <button
              key={c.id}
              type="button"
              data-testid={`directory-completeness-${c.id}`}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={completenessRowAriaLabel(c)}
              onClick={() => onCompletenessRowClick(c.id)}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                {c.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                )}
                <span className={cn('min-w-0', c.done ? 'text-foreground' : 'text-muted-foreground')}>
                  {c.label}
                </span>
              </span>
              <span
                className={cn(
                  'shrink-0 text-[10px] uppercase',
                  c.done ? 'text-emerald-600' : 'text-amber-600'
                )}
              >
                {c.done ? 'Done' : 'Needed'}
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="px-4 pt-3 pb-2">
          <CardTitle className="text-sm font-medium">User Activity</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-3 pt-0 space-y-0">
          <ActivityRow
            icon={CalendarClock}
            label="User since"
            value={formatDate(contact.created_at)}
          />
          <ActivityRow
            icon={Clock}
            label="Last updated"
            value={formatDateTime(contact.updated_at)}
          />
          <ActivityRow
            icon={Users}
            label="Linked studies"
            value={String(contact.studies.length)}
          />
          <ActivityRow
            icon={Building2}
            label="Linked sites"
            value={String(contact.sites.length)}
          />
          <ActivityRow
            icon={Building2}
            label="Linked organizations"
            value={String(contact.institutions.length)}
          />
          <ActivityRow
            icon={Users}
            label="Linked committees"
            value={String(contact.committees.length)}
          />
        </CardContent>
      </Card>

    </div>
  );
}

function ActivityRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-1.5 text-xs">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="truncate text-right tabular-nums text-foreground">{value}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared empty state                                                          */
/* -------------------------------------------------------------------------- */

function EmptySection({
  icon: Icon,
  title,
  description,
  cta,
  paddedX = false,
}: {
  icon: typeof Clock;
  title: string;
  description?: string;
  cta?: { label: string; onClick: () => void };
  paddedX?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/10 py-6 text-center',
        paddedX ? 'mx-4' : ''
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs font-medium text-foreground">{title}</p>
      {description ? (
        <p className="max-w-xs text-[11px] text-muted-foreground leading-snug">{description}</p>
      ) : null}
      {cta ? (
        <Button type="button" variant="outline" size="sm" className="text-xs" onClick={cta.onClick}>
          {cta.label}
        </Button>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Study link role edit (single row)                                          */
/* -------------------------------------------------------------------------- */

function StudyLinkRoleDialog({
  open,
  onOpenChange,
  row,
  contactId,
  studies,
  roles,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: StudyLinkRow | null;
  contactId: string;
  studies: Study[];
  roles: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);

  const studyTitle = useMemo(() => {
    if (!row) return '';
    const top = studies.find((s) => s.id === row.study_id);
    const nested = singleStudy(row.studies);
    return (
      top?.study_name?.trim() ||
      top?.title?.trim() ||
      nested?.protocol_number?.trim() ||
      top?.protocol_number?.trim() ||
      'Study'
    );
  }, [row, studies]);

  const submit = async (fd: FormData) => {
    if (!row) return;
    setPending(true);
    const rawRole = String(fd.get('directory_role_id') ?? '');
    const directory_role_id = rawRole || null;
    const { error } = await upsertContactStudyLink({
      id: row.id,
      directory_contact_id: contactId,
      study_id: row.study_id,
      directory_role_id,
      start_date: row.start_date,
      end_date: row.end_date,
      is_active: row.is_active,
      notes: row.notes,
    });
    setPending(false);
    if (error) toast.error(error);
    else {
      toast.success('Study role updated');
      onDone();
    }
  };

  const initialRoleId = row?.directory_role_id ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base">Study role</DialogTitle>
        </DialogHeader>
        {row ? (
          <form action={submit} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Study</Label>
              <p className="text-sm font-medium text-foreground">{studyTitle}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <select
                key={`edit-study-role-${row.id}-${initialRoleId}`}
                name="directory_role_id"
                defaultValue={initialRoleId}
                className="flex h-9 w-full rounded-md border border-input px-2 text-xs"
              >
                <option value="">None</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" className="text-xs" disabled={pending}>
                {pending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
