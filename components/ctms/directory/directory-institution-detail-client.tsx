'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  removeInstitutionStudyLink,
  setInstitutionStatus,
  upsertInstitutionStudyLink,
} from '@/lib/actions/directory-institutions';
import { DirectoryComments } from '@/components/ctms/directory/directory-comments-card';
import type { DirectoryCommentRow } from '@/lib/actions/directory-comments';
import type { Study } from '@/lib/types/ctms';
import {
  INSTITUTION_STUDY_RELATIONSHIP_OPTIONS,
  type InstitutionRow,
} from '@/lib/types/directory';

import { EditOrganizationDialog } from './institution-profile/edit-organization-dialog';
import { InstitutionLinkedStudiesTable } from './institution-profile/institution-linked-studies-table';
import { InstitutionPeopleTable } from './institution-profile/institution-people-table';
import { LocationCard } from './institution-profile/location-card';
import { ProfileHero } from './institution-profile/profile-hero';
import { SiteInformationCard } from './institution-profile/site-information-card';
import {
  buildAddressLine,
  detectRole,
  getProfileCopy,
  type ContactRole,
  type NormalizedContact,
  type NormalizedLinkedStudy,
} from './institution-profile/utils';

type InstitutionDetail = InstitutionRow & {
  institution_study: {
    id: string;
    study_id: string;
    relationship_type: string;
    studies?: unknown;
  }[];
  institution_study_site: {
    id: string;
    study_site_id: string;
    study_sites?: unknown;
  }[];
  directory_contact_institution: {
    id: string;
    directory_contact_id: string;
    is_primary: boolean;
    directory_contacts?: unknown;
  }[];
  parent?: { id: string; name: string } | null;
};

interface Props {
  institution: InstitutionDetail;
  canEdit: boolean;
  studies: Study[];
  currentUserId: string;
  initialComments: DirectoryCommentRow[];
}

export function DirectoryInstitutionDetailClient({
  institution: initial,
  canEdit,
  studies,
  currentUserId,
  initialComments,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [statusPending, startStatusTransition] = useTransition();
  const [studyOpen, setStudyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editFocus, setEditFocus] = useState<'name' | 'address_line1' | null>(null);

  const copy = getProfileCopy(initial.organization_type);

  const normalizedStudies: NormalizedLinkedStudy[] = useMemo(() => {
    const studyIndex = new Map(studies.map((s) => [s.id, s] as const));
    return initial.institution_study.map((row) => {
      const linked = studyIndex.get(row.study_id) ?? null;
      const studyRel = normalizeStudy(row.studies);
      const label =
        studyRel?.study_name?.trim() ||
        studyRel?.protocol_number?.trim() ||
        studyRel?.title?.trim() ||
        linked?.protocol_number ||
        linked?.title ||
        'Study';
      return {
        linkId: row.id,
        studyId: row.study_id,
        label,
        protocolNumber: studyRel?.protocol_number ?? linked?.protocol_number ?? null,
        relationshipType: row.relationship_type,
        phase: linked?.phase ?? null,
        status: linked?.status ?? null,
        fullTitle: studyRel?.title ?? linked?.title ?? null,
      } satisfies NormalizedLinkedStudy;
    });
  }, [initial.institution_study, studies]);

  const normalizedContacts: NormalizedContact[] = useMemo(() => {
    return initial.directory_contact_institution.map((row) => {
      const c = normalizeContact(row.directory_contacts);
      const roleName = c?.directory_roles?.name ?? null;
      return {
        linkId: row.id,
        contactId: c?.id ?? row.directory_contact_id ?? null,
        firstName: c?.first_name ?? null,
        lastName: c?.last_name ?? null,
        email: c?.email ?? null,
        phone: c?.phone ?? null,
        title: c?.title ?? null,
        roleName,
        detectedRole: detectRole(roleName, c?.title) as ContactRole,
        isPrimary: row.is_primary,
      } satisfies NormalizedContact;
    });
  }, [initial.directory_contact_institution]);

  const mapKey = [
    initial.address_line1,
    initial.city,
    initial.state_region,
    initial.postal_code,
    initial.id,
  ].join('|');

  const handleToggleStatus = () => {
    if (!canEdit) return;
    startStatusTransition(async () => {
      const next = initial.status === 'active' ? 'inactive' : 'active';
      const { error } = await setInstitutionStatus(initial.id, next);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(next === 'active' ? `${copy.entityNoun} activated` : `${copy.entityNoun} deactivated`);
      router.refresh();
    });
  };

  const handleRemoveStudyLink = (linkId: string) => {
    if (!canEdit) return;
    startTransition(async () => {
      await removeInstitutionStudyLink(linkId);
      toast.success('Study link removed');
      router.refresh();
    });
  };

  const handleViewMap = () => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('location-card');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openEditDialog = (focus: 'name' | 'address_line1' | null = null) => {
    setEditFocus(focus);
    setEditOpen(true);
  };

  const addressLine = buildAddressLine(initial);
  const isAddressVerified = Boolean(initial.address_line1 && initial.country_code);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <ProfileHero
        institutionId={initial.id}
        name={initial.name}
        organizationType={initial.organization_type}
        status={initial.status}
        addressLine={addressLine}
        isAddressVerified={isAddressVerified}
        linkedStudyCount={normalizedStudies.length}
        copy={copy}
        canEdit={canEdit}
        isStatusPending={statusPending}
        onEdit={() => openEditDialog(null)}
        onViewMap={handleViewMap}
        onToggleStatus={handleToggleStatus}
      />

      <section aria-labelledby="institution-information-heading">
        <SiteInformationCard
          institution={initial}
          copy={copy}
          timeZoneLabel={null}
          qualifiedAt={initial.created_at}
          activatedAt={initial.status === 'active' ? initial.updated_at : null}
          deactivatedAt={initial.status === 'inactive' ? initial.updated_at : null}
          canEdit={canEdit}
          onEdit={() => openEditDialog(null)}
        />
      </section>

      <section aria-labelledby="directory-location-heading">
        <LocationCard
          institution={initial}
          mapKey={mapKey}
          address={initial.address_line1}
          city={initial.city}
          state={initial.state_region}
          postalCode={initial.postal_code}
        />
      </section>

      <section aria-labelledby="directory-people-heading" className="space-y-2">
        <InstitutionPeopleTable copy={copy} institutionId={initial.id} contacts={normalizedContacts} />
      </section>

      <InstitutionLinkedStudiesTable
        copy={copy}
        studies={normalizedStudies}
        canEdit={canEdit}
        canLinkStudy={studies.length > 0}
        onLinkStudy={() => setStudyOpen(true)}
        onRemoveLink={handleRemoveStudyLink}
      />

      <section aria-labelledby="directory-notes-heading">
        <DirectoryComments
          entityType="institution"
          entityId={initial.id}
          canEdit={canEdit}
          currentUserId={currentUserId}
          initialComments={initialComments}
        />
      </section>

      <FooterHelpStrip entityNoun={copy.entityNoun} />

      <InstStudyDialog
        open={studyOpen}
        onOpenChange={setStudyOpen}
        institutionId={initial.id}
        studies={studies}
        existing={new Set(initial.institution_study.map((x) => `${x.study_id}-${x.relationship_type}`))}
        onDone={() => {
          setStudyOpen(false);
          router.refresh();
        }}
      />

      <EditOrganizationDialog
        institution={initial}
        open={editOpen}
        onOpenChange={setEditOpen}
        copy={copy}
        initialFocus={editFocus}
      />
    </div>
  );
}

function FooterHelpStrip({ entityNoun }: { entityNoun: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-[6px] border border-border/70 bg-muted/30 px-4 py-3 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p>
        Keep this {entityNoun.toLowerCase()} profile accurate so colleagues see the right contacts and links.
      </p>
      <Link
        href="https://help.trialetics.com"
        className="font-medium text-sky-600 hover:underline dark:text-sky-400"
      >
        Learn more in the help center →
      </Link>
    </div>
  );
}

function normalizeStudy(s: unknown):
  | { title?: string; protocol_number?: string; study_name?: string | null }
  | null {
  if (!s) return null;
  return Array.isArray(s) ? (s[0] as { title?: string; protocol_number?: string; study_name?: string | null }) : (s as { title?: string; protocol_number?: string; study_name?: string | null });
}

function normalizeContact(c: unknown):
  | {
      id?: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string | null;
      title?: string;
      directory_roles?: { id?: string; name?: string } | null;
    }
  | null {
  if (!c) return null;
  return Array.isArray(c) ? (c[0] as never) : (c as never);
}

function InstStudyDialog({
  open,
  onOpenChange,
  institutionId,
  studies,
  existing,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  institutionId: string;
  studies: Study[];
  existing: Set<string>;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);

  const submit = async (fd: FormData) => {
    const study_id = String(fd.get('study_id'));
    const relationship_type = String(fd.get('relationship_type')) as
      | 'sponsor'
      | 'cro'
      | 'central_lab'
      | 'imaging_vendor'
      | 'other';
    const key = `${study_id}-${relationship_type}`;
    if (existing.has(key)) {
      toast.error('This relationship already exists');
      return;
    }
    setPending(true);
    const { error } = await upsertInstitutionStudyLink({
      institution_id: institutionId,
      study_id,
      relationship_type,
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
          <DialogTitle>Link study</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Study</Label>
            <select
              name="study_id"
              required
              className="flex h-9 w-full rounded-md border border-input px-2 text-xs"
              disabled={studies.length === 0}
              aria-label="Study to link"
            >
              {studies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.study_name || s.protocol_number}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Relationship</Label>
            <select
              name="relationship_type"
              required
              className="flex h-9 w-full rounded-md border border-input px-2 text-xs"
              aria-label="Relationship type"
            >
              {INSTITUTION_STUDY_RELATIONSHIP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" className="text-xs" disabled={pending || studies.length === 0}>
              {pending ? 'Saving…' : 'Link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
