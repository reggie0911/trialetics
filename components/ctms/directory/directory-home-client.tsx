'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Upload, ChevronRight, FileDown, User } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { listDirectoryContacts, createDirectoryContact } from '@/lib/actions/directory-contacts';
import { listInstitutions, createInstitution as createInstitutionAction } from '@/lib/actions/directory-institutions';
import { createCommittee as createCommitteeAction } from '@/lib/actions/directory-committees';
import { importDirectoryContactsFromCsv, importInstitutionsFromCsv } from '@/lib/actions/directory-csv';
import type { DirectoryContactListItem } from '@/lib/types/directory';
import type { InstitutionRow } from '@/lib/types/directory';
import type { CommitteeRow } from '@/lib/types/directory';
import { INSTITUTION_TYPE_OPTIONS, COMMITTEE_TYPE_OPTIONS } from '@/lib/types/directory';
import {
  directoryContactFormSchema,
  institutionFormSchema,
  committeeFormSchema,
} from '@/lib/validation/directory';
import {
  QuickContactFormFields,
  type QuickContactCatalogCategory,
} from '@/components/ctms/directory/quick-contact-form-fields';
import { DirectoryCountryRegionFields } from '@/components/ctms/directory/directory-country-region-fields';
import {
  PlacesAddressAutocomplete,
  type ParsedPlace,
} from '@/components/ui/places-address-autocomplete';
import {
  DIRECTORY_CONTACTS_TEMPLATE_FILENAME,
  DIRECTORY_ORGANIZATIONS_TEMPLATE_FILENAME,
  getDirectoryContactsCsvTemplate,
  getDirectoryInstitutionsCsvTemplate,
} from '@/lib/data/directory-csv-templates';
import { triggerCsvDownload } from '@/lib/utils/csv-download';

type CatalogCat = QuickContactCatalogCategory;

interface DirectoryHomeClientProps {
  companyId: string;
  canEdit: boolean;
  canImportCsv: boolean;
  catalog: CatalogCat[];
  initialContacts: DirectoryContactListItem[];
  contactTotal: number;
  initialInstitutions: InstitutionRow[];
  institutionTotal: number;
  committees: CommitteeRow[];
  auditLog: Record<string, unknown>[];
  assignmentHistory: Record<string, unknown>[];
}

export function DirectoryHomeClient({
  companyId,
  canEdit,
  canImportCsv,
  catalog,
  initialContacts,
  contactTotal,
  initialInstitutions,
  institutionTotal,
  committees,
  auditLog,
  assignmentHistory,
}: DirectoryHomeClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState('contacts');

  const [contacts, setContacts] = useState(initialContacts);
  const [cTotal, setCTotal] = useState(contactTotal);
  const [cSearch, setCSearch] = useState('');
  const [cOffset, setCOffset] = useState(initialContacts.length);

  const [institutions, setInstitutions] = useState(initialInstitutions);
  const [iTotal, setITotal] = useState(institutionTotal);
  const [iSearch, setISearch] = useState('');
  const [iOffset, setIOffset] = useState(initialInstitutions.length);

  const [contactOpen, setContactOpen] = useState(false);
  const [instOpen, setInstOpen] = useState(false);
  const [committeeOpen, setCommitteeOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvKind, setCsvKind] = useState<'contacts' | 'institutions'>('contacts');
  const [csvText, setCsvText] = useState('');
  const [csvFileLabel, setCsvFileLabel] = useState('');
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (csvOpen) {
      setCsvText('');
      setCsvFileLabel('');
      if (csvFileInputRef.current) csvFileInputRef.current.value = '';
    }
  }, [csvOpen]);

  const refreshContacts = useCallback(() => {
    startTransition(async () => {
      const r = await listDirectoryContacts({ search: cSearch || undefined, limit: 50, offset: 0 });
      if (!r.error) {
        setContacts(r.data);
        setCTotal(r.count);
        setCOffset(r.data.length);
      }
    });
  }, [cSearch]);

  const refreshInstitutions = useCallback(() => {
    startTransition(async () => {
      const r = await listInstitutions({ search: iSearch || undefined, limit: 50, offset: 0 });
      if (!r.error) {
        setInstitutions(r.data);
        setITotal(r.count);
        setIOffset(r.data.length);
      }
    });
  }, [iSearch]);

  const loadMoreContacts = () => {
    startTransition(async () => {
      const r = await listDirectoryContacts({
        search: cSearch || undefined,
        limit: 50,
        offset: cOffset,
      });
      if (!r.error) {
        setContacts((prev) => [...prev, ...r.data]);
        setCOffset((o) => o + r.data.length);
      }
    });
  };

  const loadMoreInstitutions = () => {
    startTransition(async () => {
      const r = await listInstitutions({
        search: iSearch || undefined,
        limit: 50,
        offset: iOffset,
      });
      if (!r.error) {
        setInstitutions((prev) => [...prev, ...r.data]);
        setIOffset((o) => o + r.data.length);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Contacts & Organizations</h1>
          <p className="text-sm text-muted-foreground">
            Global contacts and organizations. Primary affiliation is the main employer or site organization; you can
            add more links on each profile.
          </p>
        </div>
        {canImportCsv && (
          <div className="flex flex-row flex-nowrap items-center gap-2 shrink-0 self-start md:self-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs whitespace-nowrap"
              onClick={() => {
                setCsvKind('contacts');
                setCsvOpen(true);
              }}
            >
              <Upload className="h-3.5 w-3.5 mr-1 shrink-0" />
              Import contacts CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs whitespace-nowrap"
              onClick={() => {
                setCsvKind('institutions');
                setCsvOpen(true);
              }}
            >
              <Upload className="h-3.5 w-3.5 mr-1 shrink-0" />
              Import organizations CSV
            </Button>
          </div>
        )}
      </div>

      <Tabs tabsId="directory-home" value={tab} onValueChange={setTab}>
        <TabsList className="h-9">
          <TabsTrigger value="contacts" className="text-xs">
            Contacts
          </TabsTrigger>
          <TabsTrigger value="institutions" className="text-xs">
            Organizations
          </TabsTrigger>
          <TabsTrigger value="committees" className="text-xs">
            Committees
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-3 mt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-8 text-xs h-9"
                placeholder="Search name or email…"
                value={cSearch}
                onChange={(e) => setCSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') refreshContacts();
                }}
              />
            </div>
            <Button type="button" variant="secondary" size="sm" className="text-xs h-9" onClick={refreshContacts}>
              Search
            </Button>
            {canEdit && (
              <Button type="button" size="sm" className="text-xs h-9" onClick={() => setContactOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add contact
              </Button>
            )}
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-10" aria-label="Photo" />
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Primary role</TableHead>
                  <TableHead className="text-xs">Organization</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-xs text-muted-foreground text-center py-8">
                      No contacts yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  contacts.map((c) => {
                    const pr = c.primary_role as { name?: string } | null | undefined;
                    const pi = c.primary_institution as { name?: string } | null | undefined;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="py-1.5">
                          <Avatar className="h-8 w-8 rounded-lg after:rounded-lg">
                            <AvatarImage src={c.avatar_url ?? undefined} alt="" className="rounded-lg" />
                            <AvatarFallback className="rounded-lg text-[10px]">
                              <User className="h-3.5 w-3.5" />
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {c.first_name} {c.last_name}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.email ?? '—'}</TableCell>
                        <TableCell className="text-xs">{pr?.name ?? '—'}</TableCell>
                        <TableCell className="text-xs">{pi?.name ?? '—'}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                            {c.status === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                            <Link href={`/protected/directory/contacts/${c.id}`}>
                              Open <ChevronRight className="h-3 w-3 ml-0.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {cOffset < cTotal && (
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={loadMoreContacts}>
              Load more
            </Button>
          )}
        </TabsContent>

        <TabsContent value="institutions" className="space-y-3 mt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-8 text-xs h-9"
                placeholder="Search organization…"
                value={iSearch}
                onChange={(e) => setISearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') refreshInstitutions();
                }}
              />
            </div>
            <Button type="button" variant="secondary" size="sm" className="text-xs h-9" onClick={refreshInstitutions}>
              Search
            </Button>
            {canEdit && (
              <Button type="button" size="sm" className="text-xs h-9" onClick={() => setInstOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add organization
              </Button>
            )}
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Location</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {institutions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-xs text-muted-foreground text-center py-8">
                      No organizations yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  institutions.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="text-xs font-medium">{i.name}</TableCell>
                      <TableCell className="text-xs capitalize">{i.organization_type.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {[i.city, i.country_code].filter(Boolean).join(', ') || '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant={i.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                          {i.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                          <Link href={`/protected/directory/institutions/${i.id}`}>
                            Open <ChevronRight className="h-3 w-3 ml-0.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {iOffset < iTotal && (
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={loadMoreInstitutions}>
              Load more
            </Button>
          )}
        </TabsContent>

        <TabsContent value="committees" className="space-y-3 mt-4">
          <div className="flex justify-end">
            {canEdit && (
              <Button type="button" size="sm" className="text-xs h-9" onClick={() => setCommitteeOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add committee
              </Button>
            )}
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Committee</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {committees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-xs text-muted-foreground text-center py-8">
                      No committees yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  committees.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs font-medium">{c.name}</TableCell>
                      <TableCell className="text-xs capitalize">{c.committee_type.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                          {c.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                          <Link href={`/protected/directory/committees/${c.id}`}>
                            Open <ChevronRight className="h-3 w-3 ml-0.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6 mt-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Profile changes</h3>
            <div className="rounded-md border max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">When</TableHead>
                    <TableHead className="text-xs">Entity</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-xs text-muted-foreground">
                        No audit entries yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLog.map((row) => (
                      <TableRow key={String(row.id)}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {row.changed_at
                            ? new Date(String(row.changed_at)).toLocaleString()
                            : '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {String(row.entity_type)} / {String(row.entity_id).slice(0, 8)}…
                        </TableCell>
                        <TableCell className="text-xs">{String(row.action)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Assignment history</h3>
            <div className="rounded-md border max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">When</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignmentHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-xs text-muted-foreground">
                        No assignment events yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignmentHistory.map((row) => (
                      <TableRow key={String(row.id)}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {row.changed_at
                            ? new Date(String(row.changed_at)).toLocaleString()
                            : '—'}
                        </TableCell>
                        <TableCell className="text-xs">{String(row.assignment_type)}</TableCell>
                        <TableCell className="text-xs">{String(row.action)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <QuickContactDialog
        companyId={companyId}
        open={contactOpen}
        onOpenChange={setContactOpen}
        catalog={catalog}
        institutions={institutions}
        onCreated={(id) => {
          setContactOpen(false);
          router.push(`/protected/directory/contacts/${id}`);
          router.refresh();
        }}
      />
      <QuickInstitutionDialog
        open={instOpen}
        onOpenChange={setInstOpen}
        institutions={institutions}
        onCreated={(id) => {
          setInstOpen(false);
          router.push(`/protected/directory/institutions/${id}`);
          router.refresh();
        }}
      />
      <QuickCommitteeDialog open={committeeOpen} onOpenChange={setCommitteeOpen} onCreated={(id) => {
        setCommitteeOpen(false);
        router.push(`/protected/directory/committees/${id}`);
        router.refresh();
      }} />

      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className="sm:max-w-xl gap-0 p-0 overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <DialogHeader className="gap-1 text-left">
              <DialogTitle className="text-base">
                Import {csvKind === 'contacts' ? 'contacts' : 'organizations'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Upload a UTF-8 CSV with a header row. Use{' '}
                <span className="font-medium text-foreground">Download template</span> for the exact columns and a sample
                row.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-4">
            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              aria-label="Upload CSV file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  setCsvText(text);
                  setCsvFileLabel(file.name);
                } catch {
                  toast.error('Could not read file');
                }
                e.target.value = '';
              }}
            />

            <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/20 px-6 py-8 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-background border border-border shadow-xs">
                <Upload className="h-5 w-5 text-muted-foreground" aria-hidden />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Choose a CSV file</p>
                <p className="text-xs text-muted-foreground">.csv files only</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="text-xs"
                  onClick={() => csvFileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Browse files
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() =>
                    triggerCsvDownload(
                      csvKind === 'contacts'
                        ? DIRECTORY_CONTACTS_TEMPLATE_FILENAME
                        : DIRECTORY_ORGANIZATIONS_TEMPLATE_FILENAME,
                      csvKind === 'contacts'
                        ? getDirectoryContactsCsvTemplate()
                        : getDirectoryInstitutionsCsvTemplate()
                    )
                  }
                >
                  <FileDown className="h-3.5 w-3.5 mr-1.5" />
                  Download template
                </Button>
              </div>
            </div>

            {csvFileLabel ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate" title={csvFileLabel}>
                    {csvFileLabel}
                  </p>
                  <p className="text-muted-foreground">Ready to import</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs shrink-0 h-8"
                  onClick={() => {
                    setCsvText('');
                    setCsvFileLabel('');
                    if (csvFileInputRef.current) csvFileInputRef.current.value = '';
                  }}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <p className="text-xs text-center text-muted-foreground">No file selected yet.</p>
            )}
          </div>

          <DialogFooter className="border-t border-border bg-muted/15 px-6 py-4 sm:justify-end gap-2">
            <Button type="button" variant="outline" className="text-xs" onClick={() => setCsvOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="text-xs"
              disabled={!csvText.trim()}
              onClick={async () => {
                if (!csvText.trim()) {
                  toast.error('Choose a CSV file first');
                  return;
                }
                const fn =
                  csvKind === 'contacts' ? importDirectoryContactsFromCsv : importInstitutionsFromCsv;
                const res = await fn(csvText);
                if (res.errors.length) toast.error(res.errors.slice(0, 3).join('; '));
                else toast.success(`Imported ${res.imported} rows`);
                if (res.skipped && res.errors.length === 0) toast.message(`${res.skipped} rows skipped`);
                setCsvOpen(false);
                setCsvText('');
                setCsvFileLabel('');
                router.refresh();
              }}
            >
              Run import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickContactDialog({
  companyId,
  open,
  onOpenChange,
  catalog,
  institutions,
  onCreated,
}: {
  companyId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  catalog: CatalogCat[];
  institutions: InstitutionRow[];
  onCreated: (id: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [roleCategoryFilter, setRoleCategoryFilter] = useState('');
  const [primaryRoleId, setPrimaryRoleId] = useState('');
  const [contactCountryCode, setContactCountryCode] = useState('');
  const [contactRegion, setContactRegion] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactAvatarUrl, setContactAvatarUrl] = useState('');

  useEffect(() => {
    if (open) {
      setRoleCategoryFilter('');
      setPrimaryRoleId('');
      setContactCountryCode('');
      setContactRegion('');
      setContactPhone('');
      setContactAvatarUrl('');
    }
  }, [open]);

  const submit = async (form: FormData) => {
    const raw = {
      first_name: String(form.get('first_name') ?? ''),
      last_name: String(form.get('last_name') ?? ''),
      title: String(form.get('title') ?? '') || undefined,
      email: String(form.get('email') ?? '') || undefined,
      avatar_url: String(form.get('avatar_url') ?? '').trim() || undefined,
      phone: String(form.get('phone') ?? '') || undefined,
      department: String(form.get('department') ?? '') || undefined,
      country_code: contactCountryCode || undefined,
      region: contactRegion || undefined,
      status: (form.get('status') as string) === 'inactive' ? 'inactive' : 'active',
      notes: String(form.get('notes') ?? '') || undefined,
      primary_directory_role_id: primaryRoleId || null,
      primary_institution_id: String(form.get('primary_institution_id') ?? '') || null,
    };
    const parsed = directoryContactFormSchema.safeParse({
      ...raw,
      primary_directory_role_id: raw.primary_directory_role_id || null,
      primary_institution_id: raw.primary_institution_id || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? 'Invalid form');
      return;
    }
    setPending(true);
    const res = await createDirectoryContact(parsed.data);
    setPending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.duplicateEmailWarning) toast.message('Another contact shares this email — please verify.');
    if (res.data) onCreated(res.data.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">New contact</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await submit(new FormData(e.currentTarget));
          }}
        >
          <QuickContactFormFields
            catalog={catalog}
            institutions={institutions}
            roleCategoryFilter={roleCategoryFilter}
            onRoleCategoryFilterChange={setRoleCategoryFilter}
            primaryRoleId={primaryRoleId}
            onPrimaryRoleChange={setPrimaryRoleId}
            contactCountryCode={contactCountryCode}
            contactRegion={contactRegion}
            onContactCountryChange={setContactCountryCode}
            onContactRegionChange={setContactRegion}
            phone={contactPhone}
            onPhoneChange={setContactPhone}
            companyId={companyId}
            avatarUrl={contactAvatarUrl}
            onAvatarUrlChange={setContactAvatarUrl}
          />
          <DialogFooter>
            <Button type="button" variant="outline" className="text-xs" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="text-xs" disabled={pending}>
              {pending ? 'Saving…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuickInstitutionDialog({
  open,
  onOpenChange,
  institutions,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  institutions: InstitutionRow[];
  onCreated: (id: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [instAddressLine1, setInstAddressLine1] = useState('');
  const [instCity, setInstCity] = useState('');
  const [instPostalCode, setInstPostalCode] = useState('');
  const [instStateRegion, setInstStateRegion] = useState('');
  const [instCountryCode, setInstCountryCode] = useState('');
  const [instRegion, setInstRegion] = useState('');

  useEffect(() => {
    if (open) {
      setInstAddressLine1('');
      setInstCity('');
      setInstPostalCode('');
      setInstStateRegion('');
      setInstCountryCode('');
      setInstRegion('');
    }
  }, [open]);

  const onNewInstitutionAddressPlaceSelected = (parsed: ParsedPlace) => {
    setInstCity(parsed.city ?? '');
    setInstPostalCode(parsed.postalCode ?? '');
    const regionLabel = parsed.stateLong ?? parsed.state ?? '';
    setInstStateRegion(regionLabel);
    setInstRegion(regionLabel);
    setInstCountryCode((prev) => {
      if (!parsed.countryCode) return prev;
      if (!prev || prev === parsed.countryCode) return parsed.countryCode;
      return prev;
    });
  };

  const submit = async (form: FormData) => {
    const raw = {
      name: String(form.get('name') ?? ''),
      organization_type: String(form.get('organization_type') ?? 'other'),
      address_line1: instAddressLine1 || undefined,
      city: instCity || undefined,
      state_region: instStateRegion || undefined,
      postal_code: instPostalCode || undefined,
      country_code: instCountryCode || undefined,
      region: instRegion || undefined,
      status: (form.get('status') as string) === 'inactive' ? 'inactive' : 'active',
      notes: String(form.get('notes') ?? '') || undefined,
      parent_institution_id: String(form.get('parent_institution_id') ?? '') || null,
    };
    const parsed = institutionFormSchema.safeParse({
      ...raw,
      parent_institution_id: raw.parent_institution_id || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? 'Invalid form');
      return;
    }
    setPending(true);
    const res = await createInstitutionAction(parsed.data);
    setPending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.data) onCreated(res.data.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">New organization</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await submit(new FormData(e.currentTarget));
          }}
        >
          <div className="space-y-1">
            <Label className="text-xs">Organization name</Label>
            <Input name="name" className="text-xs h-9" required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Organization type</Label>
            <select
              name="organization_type"
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
              defaultValue="other"
            >
              {INSTITUTION_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Parent organization (optional hierarchy)</Label>
            <select
              name="parent_institution_id"
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
              defaultValue=""
            >
              <option value="">None</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Address line 1</Label>
            <PlacesAddressAutocomplete
              value={instAddressLine1}
              onChange={setInstAddressLine1}
              onPlaceSelected={onNewInstitutionAddressPlaceSelected}
              countryBias={instCountryCode || null}
              className="text-xs h-9"
            />
          </div>
          <DirectoryCountryRegionFields
            variant="institutionAddress"
            countryCode={instCountryCode}
            region={instRegion}
            onCountryChange={setInstCountryCode}
            onRegionChange={setInstRegion}
            citySlot={
              <div className="space-y-1">
                <Label className="text-xs">City</Label>
                <Input
                  className="text-xs h-9"
                  value={instCity}
                  onChange={(e) => setInstCity(e.target.value)}
                />
              </div>
            }
          />
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <select
              name="status"
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
              defaultValue="active"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea name="notes" className="text-xs min-h-[60px]" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="text-xs" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="text-xs" disabled={pending}>
              {pending ? 'Saving…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuickCommitteeDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const [pending, setPending] = useState(false);

  const submit = async (form: FormData) => {
    const raw = {
      name: String(form.get('name') ?? ''),
      committee_type: String(form.get('committee_type') ?? 'other'),
      status: (form.get('status') as string) === 'inactive' ? 'inactive' : 'active',
      notes: String(form.get('notes') ?? '') || undefined,
    };
    const parsed = committeeFormSchema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? 'Invalid form');
      return;
    }
    setPending(true);
    const res = await createCommitteeAction(parsed.data);
    setPending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.data) onCreated(res.data.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">New committee</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input name="name" className="text-xs h-9" required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <select
              name="committee_type"
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
              defaultValue="other"
            >
              {COMMITTEE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <select
              name="status"
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
              defaultValue="active"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea name="notes" className="text-xs min-h-[60px]" />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Link this committee to a study and add members from the committee profile page.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" className="text-xs" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="text-xs" disabled={pending}>
              {pending ? 'Saving…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
