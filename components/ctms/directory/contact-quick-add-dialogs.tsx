'use client';

import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  upsertContactStudyLink,
  upsertContactSiteLink,
  upsertContactInstitutionLink,
} from '@/lib/actions/directory-contacts';
import { upsertCommitteeMember } from '@/lib/actions/directory-committees';
import {
  quickAddCommitteeLinkFormSchema,
  quickAddInstitutionLinkFormSchema,
  quickAddSiteLinkFormSchema,
  quickAddStudyLinkFormSchema,
} from '@/lib/validation/directory';
import type { CommitteeRow, InstitutionRow } from '@/lib/types/directory';
import type { Study, StudySiteWithStudy } from '@/lib/types/ctms';
import { z } from 'zod';

function studyShortLabel(s: Pick<Study, 'study_name' | 'protocol_number'>): string {
  return s.study_name?.trim() || s.protocol_number;
}

function siteLinkLabel(s: StudySiteWithStudy): string {
  const pn = s.studies?.protocol_number ?? '';
  return `${pn} / ${s.site_number} — ${s.name}`;
}

function QuickAddEntityCombobox({
  label,
  placeholder,
  itemIds,
  getItemLabel,
  value,
  onValueChange,
  emptyHint,
}: {
  label: string;
  placeholder: string;
  itemIds: string[];
  getItemLabel: (id: string) => string;
  value: string;
  onValueChange: (id: string) => void;
  emptyHint: string;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label className="text-xs">{label}</Label>
      <Combobox
        items={itemIds}
        value={value || null}
        onValueChange={(v) => onValueChange((v as string | null) ?? '')}
        itemToStringLabel={(id) => getItemLabel(id as string)}
      >
        <ComboboxInput className="w-full min-w-0" placeholder={placeholder} />
        <ComboboxContent>
          <ComboboxEmpty>{emptyHint}</ComboboxEmpty>
          <ComboboxList>
            {(id: string) => (
              <ComboboxItem key={id} value={id}>
                {getItemLabel(id)}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

type RoleOpt = { id: string; name: string };

/* -------------------------------------------------------------------------- */
/* Quick add — study                                                          */
/* -------------------------------------------------------------------------- */

type QuickStudyValues = z.infer<typeof quickAddStudyLinkFormSchema>;

export function ContactQuickAddStudySheet({
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
  roles: RoleOpt[];
  existingStudyIds: Set<string>;
  defaultDirectoryRoleId?: string | null;
  onDone: () => void;
}) {
  const form = useForm<QuickStudyValues>({
    resolver: zodResolver(quickAddStudyLinkFormSchema),
    defaultValues: {
      study_id: '',
      directory_role_id: defaultDirectoryRoleId ?? null,
    },
  });
  const watchedStudyId = useWatch({ control: form.control, name: 'study_id' });
  const watchedStudyRoleId = useWatch({ control: form.control, name: 'directory_role_id' });

  useEffect(() => {
    if (open) {
      form.reset({
        study_id: '',
        directory_role_id: defaultDirectoryRoleId ?? null,
      });
    }
  }, [open, defaultDirectoryRoleId, form]);

  const linkable = studies.filter((s) => !existingStudyIds.has(s.id));
  const linkableStudyIds = useMemo(() => linkable.map((s) => s.id), [linkable]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (existingStudyIds.has(values.study_id)) {
      toast.error('Already linked to this study');
      return;
    }
    const { error } = await upsertContactStudyLink({
      directory_contact_id: contactId,
      study_id: values.study_id,
      directory_role_id: values.directory_role_id ?? null,
      is_active: true,
    });
    if (error) toast.error(error);
    else {
      toast.success('Linked');
      onOpenChange(false);
      onDone();
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,40rem)] w-full max-w-md min-w-0 flex-col gap-4 overflow-x-hidden overflow-y-hidden p-4 sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-base">Add study link</DialogTitle>
        </DialogHeader>
        {linkable.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {studies.length === 0
              ? 'No studies available yet.'
              : 'This contact is already linked to every available study.'}
          </p>
        ) : (
          <form
            onSubmit={onSubmit}
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto"
          >
            <QuickAddEntityCombobox
              label="Study"
              placeholder="Search studies…"
              itemIds={linkableStudyIds}
              getItemLabel={(id) => {
                const s = studies.find((x) => x.id === id);
                return s ? studyShortLabel(s) : id;
              }}
              value={watchedStudyId ?? ''}
              onValueChange={(id) => form.setValue('study_id', id, { shouldValidate: true })}
              emptyHint="No matching studies."
            />
            {form.formState.errors.study_id ? (
              <p className="text-xs text-destructive">{form.formState.errors.study_id.message}</p>
            ) : null}
            <div className="min-w-0 space-y-2">
              <Label className="text-xs">Role</Label>
              <Select
                value={watchedStudyRoleId ?? '__none__'}
                onValueChange={(v) => form.setValue('directory_role_id', v === '__none__' ? null : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" getDisplayLabel={(v) => roles.find((r) => r.id === v)?.name ?? 'None'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="shrink-0 flex-row gap-2 sm:justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : 'Link'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Quick add — site                                                           */
/* -------------------------------------------------------------------------- */

type QuickSiteValues = z.infer<typeof quickAddSiteLinkFormSchema>;

export function ContactQuickAddSiteSheet({
  open,
  onOpenChange,
  contactId,
  sites,
  roles,
  existingSiteIds,
  defaultDirectoryRoleId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contactId: string;
  sites: StudySiteWithStudy[];
  roles: RoleOpt[];
  existingSiteIds: Set<string>;
  defaultDirectoryRoleId?: string | null;
  onDone: () => void;
}) {
  const form = useForm<QuickSiteValues>({
    resolver: zodResolver(quickAddSiteLinkFormSchema),
    defaultValues: {
      study_site_id: '',
      directory_role_id: defaultDirectoryRoleId ?? null,
    },
  });
  const watchedSiteId = useWatch({ control: form.control, name: 'study_site_id' });
  const watchedSiteRoleId = useWatch({ control: form.control, name: 'directory_role_id' });

  useEffect(() => {
    if (open) {
      form.reset({
        study_site_id: '',
        directory_role_id: defaultDirectoryRoleId ?? null,
      });
    }
  }, [open, defaultDirectoryRoleId, form]);

  const linkable = sites.filter((s) => !existingSiteIds.has(s.id));
  const linkableSiteIds = useMemo(() => linkable.map((s) => s.id), [linkable]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (existingSiteIds.has(values.study_site_id)) {
      toast.error('Already linked to this site');
      return;
    }
    const { error } = await upsertContactSiteLink({
      directory_contact_id: contactId,
      study_site_id: values.study_site_id,
      directory_role_id: values.directory_role_id ?? null,
      is_active: true,
    });
    if (error) toast.error(error);
    else {
      toast.success('Linked');
      onOpenChange(false);
      onDone();
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,40rem)] w-full max-w-md min-w-0 flex-col gap-4 overflow-x-hidden overflow-y-hidden p-4 sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-base">Add site link</DialogTitle>
        </DialogHeader>
        {linkable.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {sites.length === 0
              ? 'No sites available yet.'
              : 'This contact is already linked to every available site.'}
          </p>
        ) : (
          <form
            onSubmit={onSubmit}
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto"
          >
            <QuickAddEntityCombobox
              label="Site"
              placeholder="Search sites…"
              itemIds={linkableSiteIds}
              getItemLabel={(id) => {
                const s = sites.find((x) => x.id === id);
                return s ? siteLinkLabel(s) : id;
              }}
              value={watchedSiteId ?? ''}
              onValueChange={(id) => form.setValue('study_site_id', id, { shouldValidate: true })}
              emptyHint="No matching sites."
            />
            {form.formState.errors.study_site_id ? (
              <p className="text-xs text-destructive">{form.formState.errors.study_site_id.message}</p>
            ) : null}
            <div className="min-w-0 space-y-2">
              <Label className="text-xs">Role at site</Label>
              <Select
                value={watchedSiteRoleId ?? '__none__'}
                onValueChange={(v) => form.setValue('directory_role_id', v === '__none__' ? null : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" getDisplayLabel={(v) => roles.find((r) => r.id === v)?.name ?? 'None'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="shrink-0 flex-row gap-2 sm:justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : 'Link'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Quick add — organization                                                   */
/* -------------------------------------------------------------------------- */

type QuickInstValues = z.infer<typeof quickAddInstitutionLinkFormSchema>;

export function ContactQuickAddOrgSheet({
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
  const form = useForm<QuickInstValues>({
    resolver: zodResolver(quickAddInstitutionLinkFormSchema),
    defaultValues: {
      institution_id: '',
      is_primary: false,
    },
  });
  const watchedInstitutionId = useWatch({ control: form.control, name: 'institution_id' });
  const watchedIsPrimary = useWatch({ control: form.control, name: 'is_primary' });

  useEffect(() => {
    if (open) {
      form.reset({ institution_id: '', is_primary: false });
    }
  }, [open, form]);

  const linkable = institutions.filter((i) => !existingInstIds.has(i.id));
  const linkableInstitutionIds = useMemo(() => linkable.map((i) => i.id), [linkable]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (existingInstIds.has(values.institution_id)) {
      toast.error('Already linked');
      return;
    }
    const { error } = await upsertContactInstitutionLink({
      directory_contact_id: contactId,
      institution_id: values.institution_id,
      is_primary: values.is_primary,
    });
    if (error) toast.error(error);
    else {
      toast.success('Linked');
      onOpenChange(false);
      onDone();
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,40rem)] w-full max-w-md min-w-0 flex-col gap-4 overflow-x-hidden overflow-y-hidden p-4 sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-base">Link organization</DialogTitle>
        </DialogHeader>
        {linkable.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {institutions.length === 0
              ? 'No organizations available yet.'
              : 'This contact is already linked to every listed organization.'}
          </p>
        ) : (
          <form
            onSubmit={onSubmit}
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto"
          >
            <QuickAddEntityCombobox
              label="Organization"
              placeholder="Search organizations…"
              itemIds={linkableInstitutionIds}
              getItemLabel={(id) => institutions.find((x) => x.id === id)?.name ?? id}
              value={watchedInstitutionId ?? ''}
              onValueChange={(id) => form.setValue('institution_id', id, { shouldValidate: true })}
              emptyHint="No matching organizations."
            />
            {form.formState.errors.institution_id ? (
              <p className="text-xs text-destructive">{form.formState.errors.institution_id.message}</p>
            ) : null}
            <label className="flex items-center gap-2 text-xs">
              <Switch
                checked={watchedIsPrimary ?? false}
                onCheckedChange={(c) => form.setValue('is_primary', c)}
              />
              Set as primary affiliation
            </label>
            <DialogFooter className="shrink-0 flex-row gap-2 sm:justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : 'Link'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Quick add — committee                                                      */
/* -------------------------------------------------------------------------- */

type QuickCommitteeValues = z.infer<typeof quickAddCommitteeLinkFormSchema>;

export function ContactQuickAddCommitteeSheet({
  open,
  onOpenChange,
  contactId,
  committees,
  roles,
  existingCommitteeIds,
  defaultDirectoryRoleId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contactId: string;
  committees: CommitteeRow[];
  roles: RoleOpt[];
  existingCommitteeIds: Set<string>;
  /** Prefills role in committee from directory primary role when linking. */
  defaultDirectoryRoleId?: string | null;
  onDone: () => void;
}) {
  const form = useForm<QuickCommitteeValues>({
    resolver: zodResolver(quickAddCommitteeLinkFormSchema),
    defaultValues: {
      committee_id: '',
      directory_role_id: defaultDirectoryRoleId ?? null,
    },
  });
  const watchedCommitteeId = useWatch({ control: form.control, name: 'committee_id' });
  const watchedCommitteeRoleId = useWatch({ control: form.control, name: 'directory_role_id' });

  useEffect(() => {
    if (open) {
      form.reset({
        committee_id: '',
        directory_role_id: defaultDirectoryRoleId ?? null,
      });
    }
  }, [open, defaultDirectoryRoleId, form]);

  const linkable = committees.filter((c) => !existingCommitteeIds.has(c.id));
  const linkableCommitteeIds = useMemo(() => linkable.map((c) => c.id), [linkable]);

  const committeeLabel = (id: string) => {
    const c = committees.find((x) => x.id === id);
    if (!c) return id;
    return c.committee_type ? `${c.name} (${c.committee_type.replace(/_/g, ' ')})` : c.name;
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (existingCommitteeIds.has(values.committee_id)) {
      toast.error('Already a member of this committee');
      return;
    }
    const { error } = await upsertCommitteeMember({
      committee_id: values.committee_id,
      directory_contact_id: contactId,
      directory_role_id: values.directory_role_id ?? null,
      is_active: true,
    });
    if (error) toast.error(error);
    else {
      toast.success('Added to committee');
      onOpenChange(false);
      onDone();
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,40rem)] w-full max-w-md min-w-0 flex-col gap-4 overflow-x-hidden overflow-y-hidden p-4 sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-base">Add to committee</DialogTitle>
        </DialogHeader>
        {committees.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No committees exist yet. Open{' '}
            <Link href="/protected/directory/committees" className="font-medium text-primary underline underline-offset-2">
              Committees (directory setup)
            </Link>{' '}
            to create one, then return here to link this contact.
          </p>
        ) : linkable.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            This contact is already linked to every committee in your company.
          </p>
        ) : (
          <form
            onSubmit={onSubmit}
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto"
          >
            <QuickAddEntityCombobox
              label="Committee"
              placeholder="Search committees…"
              itemIds={linkableCommitteeIds}
              getItemLabel={committeeLabel}
              value={watchedCommitteeId ?? ''}
              onValueChange={(id) => form.setValue('committee_id', id, { shouldValidate: true })}
              emptyHint="No matching committees."
            />
            {form.formState.errors.committee_id ? (
              <p className="text-xs text-destructive">{form.formState.errors.committee_id.message}</p>
            ) : null}
            <div className="min-w-0 space-y-2">
              <Label className="text-xs">Role in committee</Label>
              <Select
                value={watchedCommitteeRoleId ?? '__none__'}
                onValueChange={(v) => form.setValue('directory_role_id', v === '__none__' ? null : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" getDisplayLabel={(v) => roles.find((r) => r.id === v)?.name ?? 'None'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="shrink-0 flex-row gap-2 sm:justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
