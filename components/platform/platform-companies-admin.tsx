'use client';

import { Fragment, useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronRight, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  createCustomTrackerForCompany,
  listTrackerDefinitionsForCompany,
  updateCompanyModuleAccess,
  updateCompanyStudyTrackerKeys,
  updateTrackerPlatformAccess,
  type PlatformCompanyRow,
  type PlatformGlobalTrackerRow,
  type PlatformTrackerRow,
} from '@/lib/actions/platform-module-access';
import { studyTrackerNavItems } from '@/lib/nav/study-trackers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const VALID_TABS = ['companies', 'study-trackers', 'definitions'] as const;

interface PlatformCompaniesAdminProps {
  initialTab?: string;
  initialCompanies: PlatformCompanyRow[];
  initialGlobalTrackers: PlatformGlobalTrackerRow[];
  /** When the definitions RPC/query fails; built-in list still renders. */
  definitionsListError?: string | null;
}

export function PlatformCompaniesAdmin({
  initialTab = 'companies',
  initialCompanies,
  initialGlobalTrackers,
  definitionsListError = null,
}: PlatformCompaniesAdminProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [companies, setCompanies] = useState(initialCompanies);
  const [globalTrackers, setGlobalTrackers] = useState(initialGlobalTrackers);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [trackersByCompany, setTrackersByCompany] = useState<Record<string, PlatformTrackerRow[]>>({});
  const [loadingTrackers, setLoadingTrackers] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [addCompany, setAddCompany] = useState<PlatformCompanyRow | null>(null);
  const [addName, setAddName] = useState('');
  const [addSlug, setAddSlug] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addIcon, setAddIcon] = useState('');
  const [addEntityType, setAddEntityType] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  useEffect(() => {
    setCompanies(initialCompanies);
  }, [initialCompanies]);

  useEffect(() => {
    setGlobalTrackers(initialGlobalTrackers);
  }, [initialGlobalTrackers]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && VALID_TABS.includes(t as (typeof VALID_TABS)[number])) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const onTabChange = (v: string) => {
    setActiveTab(v);
    router.replace(`/protected/platform/companies?tab=${encodeURIComponent(v)}`, { scroll: false });
  };

  const openAddTracker = (c: PlatformCompanyRow) => {
    setAddCompany(c);
    setAddName('');
    setAddSlug('');
    setAddDescription('');
    setAddIcon('');
    setAddEntityType('');
    setAddError(null);
    setAddOpen(true);
  };

  const submitAddTracker = async () => {
    if (!addCompany) return;
    setAddError(null);
    if (!addName.trim() || !addSlug.trim()) {
      setAddError('Name and slug are required.');
      return;
    }
    setAddSubmitting(true);
    try {
      const res = await createCustomTrackerForCompany(addCompany.id, {
        name: addName,
        slug: addSlug,
        description: addDescription || undefined,
        icon: addIcon || undefined,
        entity_type: addEntityType || undefined,
      });
      if (!res.success || !res.data) {
        setAddError(res.error ?? 'Failed to create tracker');
        return;
      }
      setTrackersByCompany((prev) => {
        const cur = prev[addCompany.id] ?? [];
        const next = [...cur, res.data!].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
        return { ...prev, [addCompany.id]: next };
      });
      setAddOpen(false);
      router.refresh();
    } finally {
      setAddSubmitting(false);
    }
  };

  const patchCompany = (id: string, patch: Partial<PlatformCompanyRow>) => {
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const onToggleModule = (
    company: PlatformCompanyRow,
    key: 'has_ctms_access' | 'has_eisf_access' | 'has_etmf_access' | 'has_tracker_access',
    value: boolean
  ) => {
    const prevSnapshot = company;
    const next = { ...company, [key]: value };
    patchCompany(company.id, { [key]: value });
    startTransition(async () => {
      const res = await updateCompanyModuleAccess({
        companyId: company.id,
        hasCtmsAccess: next.has_ctms_access,
        hasEisfAccess: next.has_eisf_access,
        hasEtmfAccess: next.has_etmf_access,
        hasTrackerAccess: next.has_tracker_access,
      });
      if (!res.success) {
        patchCompany(company.id, prevSnapshot);
      }
    });
  };

  const expand = async (companyId: string) => {
    if (expandedId === companyId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(companyId);
    if (trackersByCompany[companyId]) return;
    setLoadingTrackers(companyId);
    const res = await listTrackerDefinitionsForCompany(companyId);
    setLoadingTrackers(null);
    if (res.success && res.data) {
      setTrackersByCompany((prev) => ({ ...prev, [companyId]: res.data! }));
    }
  };

  const onToggleStudyKey = (company: PlatformCompanyRow, trackerKey: string, enabled: boolean) => {
    const nextSet = new Set(company.enabled_study_tracker_keys);
    if (enabled) nextSet.add(trackerKey);
    else nextSet.delete(trackerKey);
    const nextKeys = studyTrackerNavItems.filter((i) => nextSet.has(i.key)).map((i) => i.key);
    const prevKeys = company.enabled_study_tracker_keys;
    patchCompany(company.id, { enabled_study_tracker_keys: nextKeys });
    startTransition(async () => {
      const res = await updateCompanyStudyTrackerKeys({ companyId: company.id, keys: nextKeys });
      if (!res.success) {
        patchCompany(company.id, { enabled_study_tracker_keys: prevKeys });
      }
    });
  };

  const onToggleTracker = (companyId: string, tracker: PlatformTrackerRow, enabled: boolean) => {
    const prevEnabled = tracker.platform_access_enabled;
    setTrackersByCompany((prev) => ({
      ...prev,
      [companyId]: (prev[companyId] ?? []).map((t) =>
        t.id === tracker.id ? { ...t, platform_access_enabled: enabled } : t
      ),
    }));
    startTransition(async () => {
      const res = await updateTrackerPlatformAccess({
        trackerDefinitionId: tracker.id,
        enabled,
      });
      if (!res.success) {
        setTrackersByCompany((prev) => ({
          ...prev,
          [companyId]: (prev[companyId] ?? []).map((t) =>
            t.id === tracker.id ? { ...t, platform_access_enabled: prevEnabled } : t
          ),
        }));
      }
    });
  };

  return (
    <div className="space-y-6">
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add custom tracker</DialogTitle>
            <DialogDescription>
              Create a definition for {addCompany?.name ?? 'this company'}. Slug should be lowercase, e.g.{' '}
              <span className="font-mono text-foreground">visit-log</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {addError ? <p className="text-sm text-destructive">{addError}</p> : null}
            <div className="grid gap-1.5">
              <Label htmlFor="add-tracker-name">Name</Label>
              <Input
                id="add-tracker-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Visit log"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-tracker-slug">Slug</Label>
              <Input
                id="add-tracker-slug"
                value={addSlug}
                onChange={(e) => setAddSlug(e.target.value)}
                placeholder="visit-log"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-tracker-desc">Description (optional)</Label>
              <Input
                id="add-tracker-desc"
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-tracker-icon">Icon (optional)</Label>
              <Input
                id="add-tracker-icon"
                value={addIcon}
                onChange={(e) => setAddIcon(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-tracker-entity">Entity type (optional)</Label>
              <Input
                id="add-tracker-entity"
                value={addEntityType}
                onChange={(e) => setAddEntityType(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={addSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitAddTracker()} disabled={addSubmitting}>
              {addSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating…
                </>
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform — module access</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage company modules, built-in study tracker routes, and configurable custom tracker definitions.
        </p>
      </div>

      <Tabs tabsId="platform-companies" value={activeTab} onValueChange={onTabChange} className="gap-0">
        <TabsList className="w-full flex-wrap justify-start gap-1 rounded-lg border bg-muted/30 p-1 h-auto">
          <TabsTrigger value="companies" className="rounded-md data-[state=active]:border">
            Company access
          </TabsTrigger>
          <TabsTrigger value="study-trackers" className="rounded-md data-[state=active]:border">
            Study trackers
          </TabsTrigger>
          <TabsTrigger value="definitions" className="rounded-md data-[state=active]:border">
            Custom definitions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Enable CTMS, eTMF, eISF, and custom trackers per company. Expand a row to license each{' '}
            <span className="font-medium text-foreground">builder</span> definition.
          </p>
          <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Company</TableHead>
              <TableHead className="text-center">CTMS</TableHead>
              <TableHead className="text-center">eTMF</TableHead>
              <TableHead className="text-center">eISF</TableHead>
              <TableHead className="text-center">Custom trackers</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((c) => (
              <Fragment key={c.id}>
                <TableRow>
                  <TableCell className="align-middle">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => expand(c.id)}
                      aria-expanded={expandedId === c.id}
                    >
                      {expandedId === c.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={c.has_ctms_access}
                      disabled={pending}
                      onCheckedChange={(v) => onToggleModule(c, 'has_ctms_access', v)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={c.has_etmf_access}
                      disabled={pending}
                      onCheckedChange={(v) => onToggleModule(c, 'has_etmf_access', v)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={c.has_eisf_access}
                      disabled={pending}
                      onCheckedChange={(v) => onToggleModule(c, 'has_eisf_access', v)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={c.has_tracker_access}
                      disabled={pending}
                      onCheckedChange={(v) => onToggleModule(c, 'has_tracker_access', v)}
                    />
                  </TableCell>
                </TableRow>
                {expandedId === c.id && (
                  <TableRow className="bg-muted/40">
                    <TableCell colSpan={6} className="p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Custom tracker definitions
                        </p>
                        {c.has_tracker_access ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1"
                            onClick={() => openAddTracker(c)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add tracker
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1"
                            disabled
                            title="Enable Custom trackers for this company first"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add tracker
                          </Button>
                        )}
                      </div>
                      {loadingTrackers === c.id ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading…
                        </div>
                      ) : (trackersByCompany[c.id] ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No custom trackers for this company.</p>
                      ) : (
                        <ul className="space-y-2">
                          {(trackersByCompany[c.id] ?? []).map((t) => (
                            <li
                              key={t.id}
                              className={cn(
                                'flex items-center justify-between gap-4 rounded-md border bg-background px-3 py-2 text-sm'
                              )}
                            >
                              <div>
                                <span className="font-medium">{t.name}</span>
                                <span className="text-muted-foreground ml-2">/{t.slug}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-muted-foreground">Licensed</span>
                                <Switch
                                  checked={t.platform_access_enabled}
                                  disabled={pending}
                                  onCheckedChange={(v) => onToggleTracker(c.id, t, v)}
                                />
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
        </TabsContent>

        <TabsContent value="study-trackers" className="mt-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            Control which routes appear under <span className="font-medium text-foreground">Custom → Study trackers</span>{' '}
            for each company. Turn on <span className="font-medium text-foreground">Custom trackers</span> on the{' '}
            Company access tab first.
          </p>

          <div className="rounded-lg border overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-sm font-medium">Assignment by company</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Toggles update <span className="font-mono text-xs">enabled_study_tracker_keys</span> for that tenant.
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-background min-w-[8rem] shadow-[1px_0_0_hsl(var(--border))]">
                      Company
                    </TableHead>
                    {studyTrackerNavItems.map((item) => (
                      <TableHead key={item.key} className="text-center min-w-[7rem] align-bottom">
                        <span className="block text-[10px] leading-tight font-medium max-w-[6.5rem] mx-auto" title={item.label}>
                          {item.label}
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="sticky left-0 z-10 bg-background font-medium shadow-[1px_0_0_hsl(var(--border))]">
                        {c.name}
                      </TableCell>
                      {studyTrackerNavItems.map((item) => {
                        const on = c.enabled_study_tracker_keys.includes(item.key);
                        return (
                          <TableCell key={item.key} className="text-center p-2">
                            <div className="flex justify-center">
                              <Switch
                                checked={on}
                                disabled={pending || !c.has_tracker_access}
                                title={
                                  c.has_tracker_access
                                    ? item.label
                                    : 'Enable Custom trackers for this company first'
                                }
                                onCheckedChange={(v) => onToggleStudyKey(c, item.key, v)}
                              />
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="p-4 border-b">
              <h2 className="text-sm font-medium">Reference — built-in routes</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Canonical list (also in <span className="font-mono text-xs">lib/nav/study-trackers.ts</span>).
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Route</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studyTrackerNavItems.map((item) => (
                  <TableRow key={item.key}>
                    <TableCell className="font-medium">{item.label}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{item.key}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{item.href}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="definitions" className="mt-6 space-y-4">
          <div className="rounded-lg border">
            <div className="p-4 border-b">
              <h2 className="text-sm font-medium">Configurable custom trackers (all companies)</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Rows from <span className="font-mono text-foreground/80">custom_tracker_definitions</span> — the builder
                list under Custom.
                {globalTrackers.length > 0 ? (
                  <span className="ml-1">
                    ({globalTrackers.length} definition{globalTrackers.length === 1 ? '' : 's'})
                  </span>
                ) : null}
              </p>
            </div>
            {definitionsListError ? (
              <div className="px-4 py-3 text-sm text-destructive border-b bg-destructive/5">
                Could not load definitions: {definitionsListError}
              </div>
            ) : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Tracker name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-center">Licensed</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!definitionsListError && globalTrackers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-muted-foreground">
                      No company-defined custom trackers yet. Use Company access → Add tracker to create one.
                    </TableCell>
                  </TableRow>
                ) : definitionsListError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-muted-foreground">
                      Fix the error above to load definitions, or apply migration{' '}
                      <span className="font-mono text-xs">platform_list_custom_tracker_definitions</span>.
                    </TableCell>
                  </TableRow>
                ) : (
                  globalTrackers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.company_name}</TableCell>
                      <TableCell>{t.name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{t.slug}</TableCell>
                      <TableCell className="text-center">{t.platform_access_enabled ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-center">{t.active ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs">
                        {new Date(t.updated_at).toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
