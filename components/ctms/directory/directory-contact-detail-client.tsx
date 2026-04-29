'use client';

import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Building2,
  CalendarClock,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Info,
  KeyRound,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Shield,
  ShieldAlert,
  Star,
  Trash2,
  User,
  UserPlus,
  Users,
} from 'lucide-react';

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
  upsertContactSiteLink,
  removeContactInstitutionLink,
  upsertContactInstitutionLink,
  setDirectoryContactStatus,
} from '@/lib/actions/directory-contacts';
import {
  removeCommitteeMember,
  upsertCommitteeMember,
} from '@/lib/actions/directory-committees';
import { directoryContactFormSchema } from '@/lib/validation/directory';
import { DirectoryPrimaryRoleFields } from '@/components/ctms/directory/directory-primary-role-fields';
import { DirectoryCountryRegionFields } from '@/components/ctms/directory/directory-country-region-fields';
import { DirectoryContactPhotoField } from '@/components/ctms/directory/directory-contact-photo-field';
import { formatPhoneNumber, cn } from '@/lib/utils';
import type { CommitteeRow, DirectoryContactWithRelations } from '@/lib/types/directory';
import type { Study, StudySiteWithStudy } from '@/lib/types/ctms';
import type { InstitutionRow } from '@/lib/types/directory';

const contactDetailFormSchema = directoryContactFormSchema.omit({ profile_id: true });
type ContactDetailFormInput = z.input<typeof contactDetailFormSchema>;
type ContactDetailFormOutput = z.infer<typeof contactDetailFormSchema>;

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
  return (Array.isArray(i) ? i[0] : i) as { name?: string } | null;
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

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const date = d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${date} ${time}`;
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

/** Pick the contact's "primary" study row using the documented priority. */
function pickPrimaryStudyRow(
  studies: StudyLinkRow[],
  contextStudyId: string | null | undefined
): StudyLinkRow | null {
  if (!studies.length) return null;
  if (contextStudyId) {
    const ctx = studies.find((s) => s.study_id === contextStudyId);
    if (ctx) return ctx;
  }
  const active = studies.find((s) => s.is_active);
  return active ?? studies[0] ?? null;
}

function studyPhaseLabel(phase: Study['phase']): string {
  return phase ?? '';
}

function studyStatusLabel(status: Study['status']): string {
  if (!status) return '';
  return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
}

interface CompletenessCheck {
  id: 'role' | 'study' | 'site' | 'org' | 'contact';
  label: string;
  done: boolean;
}

function getCompleteness(contact: DirectoryContactWithRelations): CompletenessCheck[] {
  return [
    { id: 'role', label: 'Role assigned', done: !!contact.primary_directory_role_id },
    { id: 'study', label: 'Study linked', done: contact.studies.length > 0 },
    { id: 'site', label: 'Site linked', done: contact.sites.length > 0 },
    { id: 'org', label: 'Organization linked', done: !!contact.primary_institution_id || contact.institutions.length > 0 },
    { id: 'contact', label: 'Contact info present', done: !!contact.email || !!contact.phone },
  ];
}

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
  actions: { editProfile: () => void; openSite: () => void; openStudy: () => void }
): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (!contact.primary_directory_role_id) {
    items.push({
      id: 'no-role',
      icon: ShieldAlert,
      iconClass: 'text-amber-500',
      title: 'Primary role not assigned',
      description: 'Assign a role for this user in the directory.',
      ctaLabel: 'Assign Role',
      onAction: actions.editProfile,
    });
  }
  if (contact.sites.length === 0) {
    items.push({
      id: 'no-site',
      icon: Building2,
      iconClass: 'text-orange-500',
      title: 'Not assigned to any site',
      description: 'Assign to a site to enable visit tracking.',
      ctaLabel: 'Assign to Site',
      onAction: actions.openSite,
    });
  }
  if (contextStudyId && contextLabel && !isLinkedToContext) {
    items.push({
      id: 'no-context-study',
      icon: AlertTriangle,
      iconClass: 'text-amber-500',
      title: `Not linked to ${contextLabel}`,
      description: 'Profile will not appear on the study Directory list until linked.',
      ctaLabel: 'Link to study',
      onAction: actions.openStudy,
    });
  }
  if (contact.studies.length === 0) {
    items.push({
      id: 'no-study',
      icon: Info,
      iconClass: 'text-sky-500',
      title: 'No study links',
      description: 'Link this person to one or more studies.',
      ctaLabel: 'Assign Study',
      onAction: actions.openStudy,
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

  const flatRoles = catalog.flatMap((c) => c.roles);
  const roleLibraryReady = catalog.some((c) => (c.roles?.length ?? 0) > 0);

  const form = useForm<ContactDetailFormInput, unknown, ContactDetailFormOutput>({
    resolver: zodResolver(contactDetailFormSchema),
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
      status: initial.status,
      notes: initial.notes ?? '',
      primary_directory_role_id: initial.primary_directory_role_id ?? '',
      primary_institution_id: initial.primary_institution_id ?? '',
      secondary_role_ids: initial.secondary_roles.map((r) => r.id),
    },
  });

  const [studyOpen, setStudyOpen] = useState(false);
  const [studyRoleEditRow, setStudyRoleEditRow] = useState<StudyLinkRow | null>(null);
  const [siteOpen, setSiteOpen] = useState(false);
  const [instOpen, setInstOpen] = useState(false);
  const [committeeOpen, setCommitteeOpen] = useState(false);

  useEffect(() => {
    setContact(initial);
  }, [initial.id, initial.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps -- intentional subset of `initial`

  const resetForm = () => {
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
      status: contact.status,
      notes: contact.notes ?? '',
      primary_directory_role_id: contact.primary_directory_role_id ?? '',
      primary_institution_id: contact.primary_institution_id ?? '',
      secondary_role_ids: contact.secondary_roles.map((r) => r.id),
    });
  };

  const enterEdit = () => {
    if (!canEdit) return;
    resetForm();
    setEditingProfile(true);
  };

  const cancelEdit = () => {
    resetForm();
    setEditingProfile(false);
  };

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
          primary_directory_role_id: values.primary_directory_role_id || null,
          primary_institution_id: values.primary_institution_id || null,
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

  const primaryStudyRow = useMemo(
    () => pickPrimaryStudyRow(contact.studies, directoryContextStudyId),
    [contact.studies, directoryContextStudyId]
  );

  const primaryStudyMeta = useMemo(() => {
    if (!primaryStudyRow) return null;
    const ref = singleStudy(primaryStudyRow.studies);
    const full = studies.find((s) => s.id === primaryStudyRow.study_id) ?? null;
    return { ref, full };
  }, [primaryStudyRow, studies]);

  const primaryStudySites = useMemo(() => {
    if (!primaryStudyRow) return [];
    return contact.sites.filter((row) => {
      const ss = row.study_sites as { study_id?: string } | null;
      return ss?.study_id === primaryStudyRow.study_id;
    });
  }, [primaryStudyRow, contact.sites]);

  const completeness = useMemo(() => getCompleteness(contact), [contact]);
  const completenessRatio = useMemo(() => {
    const done = completeness.filter((c) => c.done).length;
    return { done, total: completeness.length };
  }, [completeness]);

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
      openSite: () => {
        if (!canEdit) {
          toast.message('You do not have permission to add site links.');
          return;
        }
        setSiteOpen(true);
      },
      openStudy: () => {
        if (!canEdit) {
          toast.message('You do not have permission to add study links.');
          return;
        }
        setStudyOpen(true);
      },
      openInst: () => {
        if (!canEdit) {
          toast.message('You do not have permission to add organization links.');
          return;
        }
        setInstOpen(true);
      },
      openCommittee: () => {
        if (!canEdit) {
          toast.message('You do not have permission to edit committee memberships.');
          return;
        }
        setCommitteeOpen(true);
      },
      openStudyRoleEdit: (row: StudyLinkRow) => {
        if (!canEdit) {
          toast.message('You do not have permission to edit study links.');
          return;
        }
        setStudyRoleEditRow(row);
      },
    }),
    [canEdit] // eslint-disable-line react-hooks/exhaustive-deps -- enterEdit/setters are stable
  );

  const attention = useMemo(
    () =>
      getAttentionItems(
        contact,
        directoryContextStudyId,
        isLinkedToContextStudy,
        contextStudyLabel,
        actions
      ),
    [contact, directoryContextStudyId, isLinkedToContextStudy, contextStudyLabel, actions]
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

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
          <div className="min-w-0 space-y-4">
            <StudyContextCard
              primaryStudyRow={primaryStudyRow}
              primaryStudyFull={primaryStudyMeta?.full ?? null}
              canEdit={canEdit}
              onEditStudyRole={
                primaryStudyRow
                  ? () => actions.openStudyRoleEdit(primaryStudyRow)
                  : () => {}
              }
            />

            <AssignmentOverviewCard
              primaryStudyRow={primaryStudyRow}
              primaryStudyFull={primaryStudyMeta?.full ?? null}
              primaryStudySites={primaryStudySites}
              canEdit={canEdit}
              onEditStudyRole={
                primaryStudyRow
                  ? () => actions.openStudyRoleEdit(primaryStudyRow)
                  : () => {}
              }
              onAssignSite={actions.openSite}
              onAssignStudy={actions.openStudy}
            />

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
              onAdd={actions.openStudy}
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
              onAdd={actions.openSite}
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
              onAdd={actions.openInst}
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
              onAdd={actions.openCommittee}
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
            canEdit={canEdit}
            primaryStudyRow={primaryStudyRow}
            attention={attention}
            completeness={completeness}
            actions={actions}
          />
        </div>

        <StudyLinkDialog
          open={studyOpen}
          onOpenChange={setStudyOpen}
          contactId={contact.id}
          studies={studies}
          roles={flatRoles}
          existingStudyIds={new Set(contact.studies.map((s) => s.study_id))}
          defaultDirectoryRoleId={contact.primary_directory_role_id}
          onDone={() => {
            setStudyOpen(false);
            router.refresh();
          }}
        />
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
        <SiteLinkDialog
          open={siteOpen}
          onOpenChange={setSiteOpen}
          contactId={contact.id}
          sites={sites}
          roles={flatRoles}
          existingSiteIds={new Set(contact.sites.map((s) => s.study_site_id))}
          onDone={() => {
            setSiteOpen(false);
            router.refresh();
          }}
        />
        <InstLinkDialog
          open={instOpen}
          onOpenChange={setInstOpen}
          contactId={contact.id}
          institutions={institutions}
          existingInstIds={new Set(contact.institutions.map((i) => i.institution_id))}
          onDone={() => {
            setInstOpen(false);
            router.refresh();
          }}
        />
        <CommitteeLinkDialog
          open={committeeOpen}
          onOpenChange={setCommitteeOpen}
          contactId={contact.id}
          committees={committees}
          roles={flatRoles}
          existingCommitteeIds={new Set(contact.committees.map((c) => c.committee_id))}
          onDone={() => {
            setCommitteeOpen(false);
            router.refresh();
          }}
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
          <div className="flex shrink-0 items-center gap-2">
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
/* Study context                                                               */
/* -------------------------------------------------------------------------- */

function StudyContextCard({
  primaryStudyRow,
  primaryStudyFull,
  canEdit,
  onEditStudyRole,
}: {
  primaryStudyRow: StudyLinkRow | null;
  primaryStudyFull: Study | null;
  canEdit: boolean;
  onEditStudyRole: () => void;
}) {
  const ref = singleStudy(primaryStudyRow?.studies);
  const linkedRole = singleRole(primaryStudyRow?.directory_roles);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-semibold">Study Context</CardTitle>
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            {primaryStudyRow ? '1 Study' : 'No study'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {!primaryStudyRow ? (
          <EmptySection
            icon={ClipboardList}
            title="No study linked yet"
            description="Link this contact to a study to see their study context."
          />
        ) : (
          <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,15rem)]">
            <div className="flex gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div className="min-w-0 space-y-1.5">
                <Link
                  href={`/protected/studies/${primaryStudyRow.study_id}/directory`}
                  className="text-sm font-semibold text-foreground hover:text-primary"
                >
                  {ref?.protocol_number ?? '—'}
                </Link>
                {ref?.title ? (
                  <p className="text-xs text-muted-foreground line-clamp-2">{ref.title}</p>
                ) : null}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {primaryStudyFull?.phase ? (
                    <Badge variant="outline" className="text-[10px]">
                      {studyPhaseLabel(primaryStudyFull.phase)}
                    </Badge>
                  ) : null}
                  {primaryStudyFull?.status ? (
                    <Badge
                      variant={primaryStudyFull.status === 'active' ? 'success' : 'secondary'}
                      className="text-[10px]"
                    >
                      {studyStatusLabel(primaryStudyFull.status)}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="rounded-md border border-dashed border-border/70 bg-background p-3 space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Your Role in Study
              </p>
              {linkedRole?.name ? (
                <div className="flex flex-col gap-1.5">
                  <Badge variant="info" className="text-[10px] w-fit">
                    {linkedRole.name}
                  </Badge>
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 w-full text-xs"
                      onClick={onEditStudyRole}
                    >
                      Edit study role
                    </Button>
                  ) : null}
                </div>
              ) : (
                <>
                  <Badge
                    variant="destructive"
                    className="text-[10px] inline-flex items-center gap-1"
                  >
                    <AlertCircle className="h-3 w-3" />
                    No study role
                  </Badge>
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1 h-7 w-full text-xs"
                      onClick={onEditStudyRole}
                    >
                      Assign study role
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Study & site assignments overview                                           */
/* -------------------------------------------------------------------------- */

function AssignmentOverviewCard({
  primaryStudyRow,
  primaryStudyFull,
  primaryStudySites,
  canEdit,
  onEditStudyRole,
  onAssignSite,
  onAssignStudy,
}: {
  primaryStudyRow: StudyLinkRow | null;
  primaryStudyFull: Study | null;
  primaryStudySites: SiteLinkRow[];
  canEdit: boolean;
  onEditStudyRole: () => void;
  onAssignSite: () => void;
  onAssignStudy: () => void;
}) {
  const ref = singleStudy(primaryStudyRow?.studies);
  const linkedRole = singleRole(primaryStudyRow?.directory_roles);
  const isActive = primaryStudyRow ? primaryStudyRow.is_active : false;

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-3">
        <CardTitle className="text-sm font-semibold">Study &amp; Site Assignments</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        {primaryStudyRow ? (
          <div className="rounded-lg border border-border/70 p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/protected/studies/${primaryStudyRow.study_id}/directory`}
                className="text-sm font-semibold text-foreground hover:text-primary"
              >
                {ref?.protocol_number ?? primaryStudyFull?.protocol_number ?? '—'}
              </Link>
              <Badge
                variant={isActive ? 'success' : 'secondary'}
                className="text-[10px]"
              >
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                Primary Study
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border/60 bg-muted/20 p-2.5 space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Your Role in Study
                </p>
                {linkedRole?.name ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info" className="text-[10px]">
                      {linkedRole.name}
                    </Badge>
                    {canEdit ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={onEditStudyRole}
                      >
                        Edit study role
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="destructive" className="text-[10px]">
                      No study role
                    </Badge>
                    {canEdit ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={onEditStudyRole}
                      >
                        Assign study role
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="rounded-md border border-border/60 bg-muted/20 p-2.5 space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Site Assignments
                </p>
                {primaryStudySites.length === 0 ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      Not assigned to any site
                    </span>
                    {canEdit ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={onAssignSite}
                      >
                        Assign to Site
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <ul className="text-xs space-y-1">
                    {primaryStudySites.map((row) => {
                      const ss = singleSite(row.study_sites);
                      return (
                        <li key={row.id} className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">
                            {ss ? `${ss.site_number} — ${ss.name}` : '—'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptySection
            icon={ClipboardList}
            title="No study assigned"
            description="Link this contact to a study to manage their roles and sites here."
            cta={
              canEdit
                ? { label: 'Assign Study', onClick: onAssignStudy }
                : undefined
            }
          />
        )}

        {canEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={onAssignStudy}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Assign to Another Study
          </Button>
        )}
      </CardContent>
    </Card>
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
    <Card id="contact-profile-card">
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

function ProfileDisplay({ contact }: { contact: DirectoryContactWithRelations }) {
  const primaryRole = contact.primary_role?.name;
  const category = contact.primary_role?.directory_role_categories?.name;
  const org = contact.primary_institution?.name;
  return (
    <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      <DisplayField label="First Name" value={contact.first_name} />
      <DisplayField label="Last Name" value={contact.last_name} />
      <DisplayField label="Title" value={contact.title} />
      <DisplayField label="Email" value={contact.email} />
      <DisplayField label="Phone" value={contact.phone} />
      <DisplayField label="Department" value={contact.department} />
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
      <DisplayField label="Primary role category" value={category ?? '—'} />
      <DisplayField label="Primary Organization" value={org} />
      <DisplayField label="Country" value={contact.country_code} />
      <DisplayField label="Region / State" value={contact.region} />
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
        <p className="text-xs text-muted-foreground">Primary role (library)</p>
        <p className="text-[11px] text-muted-foreground">Pick a category, then a role.</p>
      </div>
      <DirectoryPrimaryRoleFields
        catalog={catalog}
        roleId={form.watch('primary_directory_role_id') ?? ''}
        onRoleChange={(id) =>
          form.setValue('primary_directory_role_id', id, { shouldDirty: true })
        }
        disabled={!canEdit || !!catalogError || !roleLibraryReady}
      />
      <div className="space-y-1">
        <Label className="text-xs">Primary organization</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs disabled:opacity-50 max-w-full sm:max-w-md"
          disabled={!canEdit}
          {...form.register('primary_institution_id')}
        >
          <option value="">None</option>
          {institutions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Additional organizations (matrix affiliations) appear in the Organizations section below.
      </p>
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
      <DirectoryCountryRegionFields
        variant="contactRow"
        countryCode={form.watch('country_code') ?? ''}
        region={form.watch('region') ?? ''}
        onCountryChange={(c) => {
          form.setValue('country_code', c, { shouldDirty: true });
        }}
        onRegionChange={(r) => form.setValue('region', r, { shouldDirty: true })}
        disabled={!canEdit}
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

function StudyAssignmentsTable({
  rows,
  canEdit,
  onAdd,
  onEditRole,
  onRemove,
}: {
  rows: StudyLinkRow[];
  canEdit: boolean;
  onAdd: () => void;
  onEditRole: (row: StudyLinkRow) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-3">
        <DirectoryCardSectionTitle
          title="Study Assignments"
          description="Protocols this contact is linked to and their study-level directory role. Distinct from site assignments and from the primary library role on their profile."
        />
        {canEdit && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-xs h-8"
            onClick={onAdd}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-0 pb-2 pt-0">
        {rows.length === 0 ? (
          <EmptySection
            icon={ClipboardList}
            title="No study assignments yet"
            description="Link this contact to one or more studies."
            cta={canEdit ? { label: 'Add Study', onClick: onAdd } : undefined}
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
      </CardContent>
    </Card>
  );
}

function SiteAssignmentsTable({
  rows,
  canEdit,
  onAdd,
  onRemove,
}: {
  rows: SiteLinkRow[];
  canEdit: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-3">
        <DirectoryCardSectionTitle
          title="Site Assignments"
          description="Study sites (investigator locations) where this contact is assigned. Roles here can reflect responsibilities at a specific site."
        />
        {canEdit && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-xs h-8"
            onClick={onAdd}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-0 pb-2 pt-0">
        {rows.length === 0 ? (
          <EmptySection
            icon={Building2}
            title="No site assignments yet"
            description="Assign the user to one or more sites to enable monitoring and tasks."
            cta={canEdit ? { label: 'Assign to Site', onClick: onAdd } : undefined}
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
      </CardContent>
    </Card>
  );
}

function OrganizationsTable({
  rows,
  canEdit,
  onAdd,
  onRemove,
}: {
  rows: InstLinkRow[];
  canEdit: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-3">
        <DirectoryCardSectionTitle
          title="Organizations"
          description="Institutional affiliations beyond the primary organization on the profile—e.g. sponsor, site, CRO, or partner entities."
        />
        {canEdit && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-xs h-8"
            onClick={onAdd}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Link
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-0 pb-2 pt-0">
        {rows.length === 0 ? (
          <EmptySection
            icon={Building2}
            title="No organizations linked"
            description="Add organization links if this user is affiliated with any."
            cta={canEdit ? { label: 'Add Link', onClick: onAdd } : undefined}
            paddedX
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] uppercase">Organization</TableHead>
                <TableHead className="text-[10px] uppercase w-20">Primary</TableHead>
                <TableHead className="text-[10px] uppercase w-20">Role</TableHead>
                <TableHead className="text-[10px] uppercase w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const ins = singleInst(row.institutions);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs">{ins?.name ?? '—'}</TableCell>
                    <TableCell className="text-xs">
                      {row.is_primary ? (
                        <Badge variant="info" className="text-[10px]">
                          Primary
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">—</TableCell>
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
  onAdd,
  onRemove,
}: {
  rows: CommitteeLinkRow[];
  canEdit: boolean;
  onAdd: () => void;
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
          <Button type="button" size="sm" variant="outline" className="text-xs h-8" onClick={onAdd}>
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-0 pb-2 pt-0">
        {rows.length === 0 ? (
          <EmptySection
            icon={Users}
            title="No committee memberships"
            description="Add this user to committees to participate in governance."
            cta={canEdit ? { label: 'Add to committee', onClick: onAdd } : undefined}
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

function ContactRightRail({
  contact,
  canEdit,
  primaryStudyRow,
  attention,
  completeness,
  actions,
}: {
  contact: DirectoryContactWithRelations;
  canEdit: boolean;
  primaryStudyRow: StudyLinkRow | null;
  attention: AttentionItem[];
  completeness: CompletenessCheck[];
  actions: {
    editProfile: () => void;
    openSite: () => void;
    openStudy: () => void;
    openInst: () => void;
    openStudyRoleEdit: (row: StudyLinkRow) => void;
  };
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
        <CardContent className="px-4 pb-3 pt-0 space-y-1.5">
          {completeness.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-2">
                {c.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                )}
                <span className={cn(c.done ? 'text-foreground' : 'text-muted-foreground')}>
                  {c.label}
                </span>
              </span>
              <span
                className={cn(
                  'text-[10px] uppercase',
                  c.done ? 'text-emerald-600' : 'text-amber-600'
                )}
              >
                {c.done ? 'Done' : 'Needed'}
              </span>
            </div>
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
          <ActivityRow icon={ClipboardList} label="Tasks assigned" value="—" />
          <ActivityRow icon={CheckCircle2} label="Visits logged" value="—" />
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
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="px-4 pt-3 pb-2">
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3 pt-0 space-y-0.5">
          <QuickAction
            icon={UserPlus}
            label={primaryStudyRow ? 'Study role' : 'Assign Role'}
            description={
              primaryStudyRow
                ? 'Set or update role on the linked study'
                : 'Set directory primary role or link a study first'
            }
            disabled={!canEdit}
            disabledReason={!canEdit ? 'You do not have permission to edit this profile.' : undefined}
            onClick={() =>
              primaryStudyRow
                ? actions.openStudyRoleEdit(primaryStudyRow)
                : actions.editProfile()
            }
          />
          <QuickAction
            icon={Building2}
            label="Assign to Site"
            description="Link user to one or more sites"
            disabled={!canEdit}
            disabledReason={!canEdit ? 'You do not have permission to add site links.' : undefined}
            onClick={actions.openSite}
          />
          <QuickAction
            icon={Shield}
            label="Manage Permissions"
            description="View and manage user access"
            disabled
            disabledReason="Permissions are managed in the platform settings."
          />
          <QuickAction
            icon={ClipboardList}
            label="View Audit Trail"
            description="See history of changes"
            disabled
            disabledReason="Per-contact audit trail is not available here yet."
          />
          <QuickAction
            icon={KeyRound}
            label="Reset Password"
            description="Send password reset email"
            disabled={!contact.profile_id}
            disabledReason={
              !contact.profile_id
                ? 'No linked app login on this contact.'
                : undefined
            }
            onClick={() => toast.message('Password reset is sent from the app login screen.')}
          />
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="px-4 pt-3 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
            User Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0 space-y-1">
          <p className="text-[11px] text-muted-foreground leading-snug">
            Need help managing users?
          </p>
          <Link
            href="/protected/directory"
            className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline dark:text-sky-400"
          >
            View user management guide
            <ChevronRight className="h-3 w-3" />
          </Link>
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

function QuickAction({
  icon: Icon,
  label,
  description,
  disabled = false,
  disabledReason,
  onClick,
}: {
  icon: typeof Clock;
  label: string;
  description: string;
  disabled?: boolean;
  disabledReason?: string;
  onClick?: () => void;
}) {
  const button = (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left transition-colors',
        !disabled && 'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <span className="flex items-center gap-2 min-w-0">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0">
          <span className="block text-xs text-foreground leading-tight">{label}</span>
          <span className="block text-[10px] text-muted-foreground leading-tight truncate">
            {description}
          </span>
        </span>
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </button>
  );

  if (disabled && disabledReason) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="block" />}>{button}</TooltipTrigger>
        <TooltipContent side="left">{disabledReason}</TooltipContent>
      </Tooltip>
    );
  }
  return button;
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
/* Link dialogs (preserved)                                                    */
/* -------------------------------------------------------------------------- */

function StudyLinkDialog({
  open,
  onOpenChange,
  contactId,
  studies,
  roles,
  existingStudyIds,
  defaultDirectoryRoleId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contactId: string;
  studies: Study[];
  roles: { id: string; name: string }[];
  existingStudyIds: Set<string>;
  /** Pre-selects study role from directory primary role when linking. */
  defaultDirectoryRoleId?: string | null;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);

  const submit = async (fd: FormData) => {
    const study_id = String(fd.get('study_id'));
    if (existingStudyIds.has(study_id)) {
      toast.error('Already linked to this study');
      return;
    }
    setPending(true);
    const rawRole = String(fd.get('directory_role_id') ?? '');
    const directory_role_id = rawRole || null;
    const { error } = await upsertContactStudyLink({
      directory_contact_id: contactId,
      study_id,
      directory_role_id,
      is_active: true,
    });
    setPending(false);
    if (error) toast.error(error);
    else {
      toast.success('Linked');
      onDone();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base">Link study</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Study</Label>
            <select
              name="study_id"
              required
              className="flex h-9 w-full rounded-md border border-input px-2 text-xs"
            >
              {studies.map((s) => (
                <option key={s.id} value={s.id} disabled={existingStudyIds.has(s.id)}>
                  {s.study_name || s.protocol_number}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Role</Label>
            <select
              key={`study-link-role-${open}-${defaultDirectoryRoleId ?? ''}`}
              name="directory_role_id"
              defaultValue={defaultDirectoryRoleId ?? ''}
              className="flex h-9 w-full rounded-md border border-input px-2 text-xs"
            >
              <option value="">None</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {defaultDirectoryRoleId ? (
              <p className="text-[11px] text-muted-foreground leading-snug">
                Defaults to Primary Role (Library). Choose None to link without a study role.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="submit" className="text-xs" disabled={pending}>
              {pending ? 'Saving…' : 'Link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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

function SiteLinkDialog({
  open,
  onOpenChange,
  contactId,
  sites,
  roles,
  existingSiteIds,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contactId: string;
  sites: StudySiteWithStudy[];
  roles: { id: string; name: string }[];
  existingSiteIds: Set<string>;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);

  const submit = async (fd: FormData) => {
    const study_site_id = String(fd.get('study_site_id'));
    if (existingSiteIds.has(study_site_id)) {
      toast.error('Already linked to this site');
      return;
    }
    setPending(true);
    const { error } = await upsertContactSiteLink({
      directory_contact_id: contactId,
      study_site_id,
      directory_role_id: String(fd.get('directory_role_id')) || null,
      is_active: true,
    });
    setPending(false);
    if (error) toast.error(error);
    else {
      toast.success('Linked');
      onDone();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base">Link site</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Site</Label>
            <select
              name="study_site_id"
              required
              className="flex h-9 w-full rounded-md border border-input px-2 text-xs"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id} disabled={existingSiteIds.has(s.id)}>
                  {s.studies?.protocol_number} / {s.site_number} — {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Role</Label>
            <select
              name="directory_role_id"
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
              {pending ? 'Saving…' : 'Link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InstLinkDialog({
  open,
  onOpenChange,
  contactId,
  institutions,
  existingInstIds,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contactId: string;
  institutions: InstitutionRow[];
  existingInstIds: Set<string>;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);

  const submit = async (fd: FormData) => {
    const institution_id = String(fd.get('institution_id'));
    if (existingInstIds.has(institution_id)) {
      toast.error('Already linked');
      return;
    }
    setPending(true);
    const { error } = await upsertContactInstitutionLink({
      directory_contact_id: contactId,
      institution_id,
      is_primary: fd.get('is_primary') === 'on',
    });
    setPending(false);
    if (error) toast.error(error);
    else {
      toast.success('Linked');
      onDone();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base">Link organization</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Organization</Label>
            <select
              name="institution_id"
              required
              className="flex h-9 w-full rounded-md border border-input px-2 text-xs"
            >
              {institutions.map((i) => (
                <option key={i.id} value={i.id} disabled={existingInstIds.has(i.id)}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" name="is_primary" />
            Set as primary affiliation
          </label>
          <DialogFooter>
            <Button type="submit" className="text-xs" disabled={pending}>
              {pending ? 'Saving…' : 'Link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CommitteeLinkDialog({
  open,
  onOpenChange,
  contactId,
  committees,
  roles,
  existingCommitteeIds,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contactId: string;
  committees: CommitteeRow[];
  roles: { id: string; name: string }[];
  existingCommitteeIds: Set<string>;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const linkable = committees.filter((c) => !existingCommitteeIds.has(c.id));

  const submit = async (fd: FormData) => {
    const committee_id = String(fd.get('committee_id'));
    if (existingCommitteeIds.has(committee_id)) {
      toast.error('Already a member of this committee');
      return;
    }
    setPending(true);
    const { error } = await upsertCommitteeMember({
      committee_id,
      directory_contact_id: contactId,
      directory_role_id: String(fd.get('directory_role_id')) || null,
      is_active: true,
    });
    setPending(false);
    if (error) toast.error(error);
    else {
      toast.success('Added to committee');
      onDone();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base">Add to committee</DialogTitle>
        </DialogHeader>
        {committees.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No committees exist yet. Open{' '}
            <Link
              href="/protected/directory/committees"
              className="font-medium text-primary underline underline-offset-2"
            >
              Committees (directory setup)
            </Link>{' '}
            to create one, then return here to link this contact.
          </p>
        ) : linkable.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            This contact is already linked to every committee in your company.
          </p>
        ) : (
          <form action={submit} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Committee</Label>
              <select
                name="committee_id"
                required
                className="flex h-9 w-full rounded-md border border-input px-2 text-xs"
              >
                {linkable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.committee_type ? ` (${c.committee_type.replace(/_/g, ' ')})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role in committee</Label>
              <select
                name="directory_role_id"
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
                {pending ? 'Saving…' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
