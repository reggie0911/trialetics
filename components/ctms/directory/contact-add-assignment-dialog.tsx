'use client';

import { useCallback, useEffect, useMemo, useState, startTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  removeContactInstitutionLink,
  removeContactSiteLink,
  removeContactStudyLink,
  upsertContactAssignmentsBatch,
} from '@/lib/actions/directory-contacts';
import { removeCommitteeMember } from '@/lib/actions/directory-committees';
import {
  emitDirectoryAssignmentAnalytics,
  type DirectoryAssignmentOpenEntry,
} from '@/lib/directory/contact-assignment-analytics';
import type { CommitteeRow, DirectoryContactWithRelations, InstitutionRow } from '@/lib/types/directory';
import type { Study, StudySiteWithStudy } from '@/lib/types/ctms';
import { cn } from '@/lib/utils';

type RoleOpt = { id: string; name: string };
type CatalogCat = { id: string; name: string; roles: RoleOpt[] };

export type AddAssignmentInitialTab = 'studies' | 'role' | 'sites' | 'org' | 'committees' | 'review';

function studyShortLabel(s: Pick<Study, 'study_name' | 'protocol_number'>): string {
  return s.study_name?.trim() || s.protocol_number;
}

export function ContactAddAssignmentDialog({
  open,
  onOpenChange,
  contact,
  studies,
  sites,
  institutions,
  committees,
  roles,
  catalog,
  existingStudyIds,
  existingSiteIds,
  existingInstIds,
  existingCommitteeIds,
  initialTab = 'studies',
  analyticsEntry = 'completeness',
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contact: DirectoryContactWithRelations;
  studies: Study[];
  sites: StudySiteWithStudy[];
  institutions: InstitutionRow[];
  committees: CommitteeRow[];
  roles: RoleOpt[];
  catalog: CatalogCat[];
  existingStudyIds: Set<string>;
  existingSiteIds: Set<string>;
  existingInstIds: Set<string>;
  existingCommitteeIds: Set<string>;
  initialTab?: AddAssignmentInitialTab;
  analyticsEntry?: DirectoryAssignmentOpenEntry;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<string>('studies');
  const [studySearch, setStudySearch] = useState('');
  const [studyIds, setStudyIds] = useState<string[]>([]);
  const [studyRoleById, setStudyRoleById] = useState<Record<string, string | null>>({});
  const derivedRoleId = useMemo(() => {
    for (const study of contact.studies ?? []) {
      if (study.directory_roles?.id) return study.directory_roles.id;
    }
    for (const site of contact.sites ?? []) {
      if (site.directory_roles?.id) return site.directory_roles.id;
    }
    return null;
  }, [contact.studies, contact.sites]);

  const [defaultRoleId, setDefaultRoleId] = useState<string | null>(derivedRoleId);
  const [siteIds, setSiteIds] = useState<string[]>([]);
  const [siteRoleById, setSiteRoleById] = useState<Record<string, string | null>>({});
  const [orgInstitutionId, setOrgInstitutionId] = useState<string | null>(null);
  const [orgPrimary, setOrgPrimary] = useState(false);
  const [committeeIds, setCommitteeIds] = useState<string[]>([]);
  const [committeeRoleById, setCommitteeRoleById] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    startTransition(() => {
      setTab(initialTab);
      setStudySearch('');
      setStudyIds([]);
      setStudyRoleById({});
      setDefaultRoleId(derivedRoleId);
      setSiteIds([]);
      setSiteRoleById({});
      setOrgInstitutionId(null);
      setOrgPrimary(false);
      setCommitteeIds([]);
      setCommitteeRoleById({});
    });
    emitDirectoryAssignmentAnalytics('opened', { entry: analyticsEntry, contactId: contact.id });
  }, [open, initialTab, contact.id, derivedRoleId, analyticsEntry]);

  const roleForStudy = useCallback(
    (studyId: string) => (studyId in studyRoleById ? studyRoleById[studyId]! : defaultRoleId),
    [studyRoleById, defaultRoleId],
  );
  const roleForSite = useCallback(
    (siteId: string) => (siteId in siteRoleById ? siteRoleById[siteId]! : defaultRoleId),
    [siteRoleById, defaultRoleId],
  );
  const roleForCommittee = useCallback(
    (cid: string) => (cid in committeeRoleById ? committeeRoleById[cid]! : defaultRoleId),
    [committeeRoleById, defaultRoleId],
  );

  const sitesByStudy = useMemo(() => {
    const map = new Map<string, StudySiteWithStudy[]>();
    for (const sid of studyIds) {
      map.set(sid, sites.filter((s) => s.study_id === sid && !existingSiteIds.has(s.id)));
    }
    return map;
  }, [studyIds, sites, existingSiteIds]);

  const filteredStudies = useMemo(() => {
    const q = studySearch.trim().toLowerCase();
    return studies.filter((s) => {
      if (!q) return true;
      const t = `${s.protocol_number} ${s.title} ${s.study_name ?? ''}`.toLowerCase();
      return t.includes(q);
    });
  }, [studies, studySearch]);

  const liveSummary = useMemo(() => {
    const org = orgInstitutionId ? 1 : 0;
    return `${studyIds.length} studies · ${siteIds.length} sites · ${org} org · ${committeeIds.length} committees`;
  }, [studyIds.length, siteIds.length, orgInstitutionId, committeeIds.length]);

  const existingPrimaryInstitutionId = contact.institutions?.find((i) => i.is_primary)?.institution_id ?? null;
  const primaryOrgWarning =
    orgPrimary &&
    orgInstitutionId &&
    existingPrimaryInstitutionId &&
    orgInstitutionId !== existingPrimaryInstitutionId;

  const toggleStudy = (id: string) => {
    if (existingStudyIds.has(id)) return;
    setStudyIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSite = (id: string) => {
    if (existingSiteIds.has(id)) return;
    setSiteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleCommittee = (id: string) => {
    if (existingCommitteeIds.has(id)) return;
    setCommitteeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllSitesForStudy = (studyId: string) => {
    const list = sitesByStudy.get(studyId) ?? [];
    setSiteIds((prev) => {
      const set = new Set(prev);
      for (const s of list) set.add(s.id);
      return [...set];
    });
  };

  const submit = async () => {
    setSubmitting(true);
    const studyLinks = studyIds.map((study_id) => ({
      study_id,
      directory_role_id: roleForStudy(study_id),
      is_active: true as const,
      notes: null as string | null,
    }));
    const siteLinks = siteIds.map((study_site_id) => ({
      study_site_id,
      directory_role_id: roleForSite(study_site_id),
      is_active: true as const,
    }));
    const orgLink =
      orgInstitutionId ?
        { institution_id: orgInstitutionId, is_primary: orgPrimary }
      : null;
    const committeeLinks = committeeIds.map((committee_id) => ({
      committee_id,
      directory_role_id: roleForCommittee(committee_id),
      is_active: true as const,
    }));

    const payload = {
      directory_contact_id: contact.id,
      studyLinks,
      siteLinks,
      orgLink,
      committeeLinks,
    };

    const res = await upsertContactAssignmentsBatch(payload);
    setSubmitting(false);

    const created =
      res.createdIds.study.length +
      res.createdIds.site.length +
      res.createdIds.institution.length +
      res.createdIds.committee.length;

    emitDirectoryAssignmentAnalytics('submitted', {
      entry: analyticsEntry,
      contactId: contact.id,
      studyCount: res.createdIds.study.length,
      siteCount: res.createdIds.site.length,
      orgCount: res.createdIds.institution.length,
      committeeCount: res.createdIds.committee.length,
      errorCount: res.rowErrors.length + (res.error ? 1 : 0),
    });

    if (res.error && created === 0) {
      toast.error(res.error);
      return;
    }
    if (res.rowErrors.length) {
      toast.message(res.rowErrors.slice(0, 3).join(' · ') + (res.rowErrors.length > 3 ? '…' : ''));
    }
    if (created > 0) {
      toast.success('Assignments updated', {
        duration: 8000,
        action: {
          label: 'Undo',
          onClick: async () => {
            for (const id of [...res.createdIds.committee].reverse()) {
              await removeCommitteeMember(id);
            }
            for (const id of [...res.createdIds.site].reverse()) {
              await removeContactSiteLink(id);
            }
            for (const id of [...res.createdIds.study].reverse()) {
              await removeContactStudyLink(id);
            }
            for (const id of [...res.createdIds.institution].reverse()) {
              await removeContactInstitutionLink(id);
            }
            toast.message('Reverted batch');
            router.refresh();
            onSuccess();
          },
        },
      });
      onOpenChange(false);
      router.refresh();
      onSuccess();
    } else if (!res.error) {
      toast.message('Nothing new to link.');
      onOpenChange(false);
    }
  };

  const body = (
    <div className="flex max-h-[min(80vh,720px)] flex-col gap-3 overflow-hidden">
      <div className="text-muted-foreground shrink-0 rounded-md border border-dashed bg-muted/20 px-3 py-2 text-[11px] font-medium tabular-nums">
        {liveSummary}
      </div>
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-2">
        <TabsList className="no-scrollbar h-auto w-full shrink-0 flex-wrap justify-start gap-1 overflow-x-auto">
          <TabsTrigger value="studies" className="text-xs">
            Studies
          </TabsTrigger>
          <TabsTrigger value="role" className="text-xs">
            Role
          </TabsTrigger>
          <TabsTrigger value="sites" className="text-xs">
            Sites
          </TabsTrigger>
          <TabsTrigger value="org" className="text-xs">
            Org
          </TabsTrigger>
          <TabsTrigger value="committees" className="text-xs">
            Committees
          </TabsTrigger>
          <TabsTrigger value="review" className="text-xs">
            Review
          </TabsTrigger>
        </TabsList>
        <ScrollArea className="min-h-[200px] flex-1 pr-2">
          <TabsContent value="studies" className="mt-0 space-y-3 outline-none">
            <Input
              placeholder="Search studies…"
              value={studySearch}
              onChange={(e) => setStudySearch(e.target.value)}
              className="h-8 text-xs"
            />
            <div className="space-y-2">
              {filteredStudies.map((s) => {
                const disabled = existingStudyIds.has(s.id);
                const checked = studyIds.includes(s.id);
                return (
                  <div
                    key={s.id}
                    data-testid="add-assignment-study-row"
                    data-study-id={s.id}
                    className={cn(
                      'flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5',
                      disabled && 'opacity-50',
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={() => toggleStudy(s.id)}
                      aria-label={studyShortLabel(s)}
                    />
                    <span className="min-w-0 flex-1 text-xs font-medium">{studyShortLabel(s)}</span>
                    {checked && !disabled ? (
                      <Select
                        value={studyRoleById[s.id] ?? '__default__'}
                        onValueChange={(v) =>
                          setStudyRoleById((m) => {
                            const next = { ...m };
                            if (v === '__default__') delete next[s.id];
                            else next[s.id] = v;
                            return next;
                          })
                        }
                      >
                        <SelectTrigger className="h-7 w-[140px] text-[10px]">
                          <SelectValue
                            placeholder="Role"
                            getDisplayLabel={(v) => {
                              if (v === '__default__' || v == null) return 'Use default';
                              return roles.find((r) => r.id === v)?.name ?? 'Role';
                            }}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__default__">Use default</SelectItem>
                          {roles.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                    {disabled ? (
                      <span className="text-[10px] text-muted-foreground">Already linked</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="role" className="mt-0 space-y-2 outline-none">
            <Label className="text-xs">Default role for new links</Label>
            <Select
              value={defaultRoleId ?? '__none__'}
              onValueChange={(v) => setDefaultRoleId(v === '__none__' ? null : v)}
            >
              <SelectTrigger className="w-full" data-testid="add-assignment-default-role">
                <SelectValue placeholder="None" getDisplayLabel={(v) => roles.find((r) => r.id === v)?.name ?? 'None'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {catalog.map((cat) => (
                  <SelectGroup key={cat.id}>
                    <SelectLabel>{cat.name}</SelectLabel>
                    {cat.roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Per-study, per-site, and per-committee overrides are available on their tabs when you pick &quot;Use
              default&quot; or a specific role inline.
            </p>
          </TabsContent>

          <TabsContent value="sites" className="mt-0 space-y-3 outline-none">
            {studyIds.length === 0 ? (
              <p className="text-xs text-muted-foreground">Select at least one study first.</p>
            ) : (
              studyIds.map((studyId) => {
                const st = studies.find((x) => x.id === studyId);
                const list = sitesByStudy.get(studyId) ?? [];
                return (
                  <details key={studyId} open className="rounded-md border">
                    <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium">
                      {st ? studyShortLabel(st) : studyId}
                      <Button
                        type="button"
                        variant="link"
                        className="ml-2 h-auto p-0 text-[10px]"
                        onClick={(e) => {
                          e.preventDefault();
                          selectAllSitesForStudy(studyId);
                        }}
                      >
                        Select all
                      </Button>
                    </summary>
                    <div className="space-y-1 border-t px-2 py-2">
                      {list.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">No linkable sites for this study.</p>
                      ) : (
                        list.map((s) => (
                          <div key={s.id} className="flex flex-wrap items-center gap-2 py-0.5">
                            <Checkbox
                              checked={siteIds.includes(s.id)}
                              onCheckedChange={() => toggleSite(s.id)}
                              aria-label={`${s.site_number} ${s.name}`}
                            />
                            <span className="min-w-0 flex-1 text-xs">
                              {s.site_number} — {s.name}
                            </span>
                            {siteIds.includes(s.id) ? (
                              <Select
                                value={siteRoleById[s.id] ?? '__default__'}
                                onValueChange={(v) =>
                                  setSiteRoleById((m) => {
                                    const next = { ...m };
                                    if (v === '__default__') delete next[s.id];
                                    else next[s.id] = v;
                                    return next;
                                  })
                                }
                              >
                                <SelectTrigger className="h-7 w-[130px] text-[10px]">
                                  <SelectValue
                                    getDisplayLabel={(v) => {
                                      if (v === '__default__' || v == null) return 'Use default';
                                      return roles.find((r) => r.id === v)?.name ?? 'Role';
                                    }}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__default__">Use default</SelectItem>
                                  {roles.map((r) => (
                                    <SelectItem key={r.id} value={r.id}>
                                      {r.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </details>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="org" className="mt-0 space-y-3 outline-none">
            <Label className="text-xs">Organization (optional)</Label>
            <Select
              value={orgInstitutionId ?? '__skip__'}
              onValueChange={(v) => setOrgInstitutionId(v === '__skip__' ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder="Skip"
                  getDisplayLabel={(v) =>
                    v === '__skip__' || !v ? 'Skip' : (institutions.find((i) => i.id === v)?.name ?? 'Skip')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__skip__">Skip</SelectItem>
                {institutions
                  .filter((i) => !existingInstIds.has(i.id))
                  .map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {orgInstitutionId ? (
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={orgPrimary} onCheckedChange={setOrgPrimary} />
                Set as primary affiliation
              </label>
            ) : null}
            {primaryOrgWarning ? (
              <Alert>
                <AlertDescription className="text-xs">
                  This will replace the current primary organization on the profile with the newly selected one.
                </AlertDescription>
              </Alert>
            ) : null}
          </TabsContent>

          <TabsContent value="committees" className="mt-0 space-y-2 outline-none">
            {committees.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No committees yet.{' '}
                <Link href="/protected/directory/committees" className="text-primary underline underline-offset-2">
                  Open directory setup
                </Link>
              </p>
            ) : (
              committees.map((c) => {
                if (existingCommitteeIds.has(c.id)) {
                  return (
                    <div key={c.id} className="flex items-center gap-2 text-xs opacity-50">
                      <Checkbox checked disabled />
                      {c.name}
                      <span className="text-muted-foreground">Already linked</span>
                    </div>
                  );
                }
                const checked = committeeIds.includes(c.id);
                return (
                  <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5">
                    <Checkbox checked={checked} onCheckedChange={() => toggleCommittee(c.id)} />
                    <span className="min-w-0 flex-1 text-xs font-medium">{c.name}</span>
                    {checked ? (
                      <Select
                        value={committeeRoleById[c.id] ?? '__default__'}
                        onValueChange={(v) =>
                          setCommitteeRoleById((m) => {
                            const next = { ...m };
                            if (v === '__default__') delete next[c.id];
                            else next[c.id] = v;
                            return next;
                          })
                        }
                      >
                        <SelectTrigger className="h-7 w-[130px] text-[10px]">
                          <SelectValue
                            getDisplayLabel={(v) => {
                              if (v === '__default__' || v == null) return 'Use default';
                              return roles.find((r) => r.id === v)?.name ?? 'Role';
                            }}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__default__">Use default</SelectItem>
                          {roles.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="review" className="mt-0 space-y-2 outline-none">
            <p className="text-xs text-muted-foreground">{liveSummary}</p>
            <p className="text-xs">
              Submitting will create any new study, site, organization, and committee links shown above. Existing links
              are skipped automatically.
            </p>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );

  const footer = (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t pt-3">
      <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <div className="flex gap-2">
        {tab !== 'studies' ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const order = ['studies', 'role', 'sites', 'org', 'committees', 'review'];
              const i = order.indexOf(tab);
              if (i > 0) setTab(order[i - 1]!);
            }}
          >
            Back
          </Button>
        ) : null}
        {tab !== 'review' ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const order = ['studies', 'role', 'sites', 'org', 'committees', 'review'];
              const i = order.indexOf(tab);
              if (i < order.length - 1) setTab(order[i + 1]!);
            }}
            disabled={tab === 'sites' && studyIds.length === 0}
          >
            Continue
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            data-testid="add-assignment-submit"
            disabled={submitting}
            onClick={() => void submit()}
          >
            {submitting ? 'Saving…' : 'Submit'}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="add-assignment-dialog"
        className="flex max-h-[min(92vh,900px)] max-w-3xl flex-col gap-0 overflow-hidden p-4 sm:p-6"
      >
        <DialogHeader>
          <DialogTitle className="text-base">
            Add assignment — {contact.first_name} {contact.last_name}
          </DialogTitle>
        </DialogHeader>
        {body}
        <DialogFooter className="mt-3 block w-full sm:justify-between">{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
