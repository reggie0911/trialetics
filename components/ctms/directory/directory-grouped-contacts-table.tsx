'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Eye, Mail, Phone, User } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { siteRoleCoverageFromRoleNames } from '@/lib/directory/contact-health';
import type { DirectoryContactListItem } from '@/lib/types/directory';
import { cn } from '@/lib/utils';
import { DirectoryEmptyState } from '@/components/ctms/directory/directory-empty-state';
import { getContactCompleteness } from '@/lib/directory/record-completeness';
import { getCountryName } from '@/lib/data/countries';

const UNASS = '__unassigned__';

type Group = { key: string; label: string; rows: DirectoryContactListItem[] };

function buildGroups(contacts: DirectoryContactListItem[]): Group[] {
  const m = new Map<string, { label: string; rows: DirectoryContactListItem[] }>();
  for (const c of contacts) {
    const e = c.study_enrichment;
    const key = e?.primary_study_site_id ?? c.primary_institution?.id ?? UNASS;
    const label =
      e?.primary_study_site_label?.trim() ||
      c.primary_institution?.name?.trim() ||
      (key === UNASS ? 'Unassigned to site' : '—');
    const g = m.get(key) ?? { label, rows: [] as DirectoryContactListItem[] };
    g.label = label;
    g.rows.push(c);
    m.set(key, g);
  }
  const arr: Group[] = Array.from(m.entries()).map(([key, v]) => ({ key, label: v.label, rows: v.rows }));
  arr.sort((a, b) => {
    if (a.key === UNASS) return 1;
    if (b.key === UNASS) return -1;
    return a.label.localeCompare(b.label);
  });
  return arr;
}

function roleBadgeClass(roleId: string) {
  let h = 0;
  for (let i = 0; i < roleId.length; i++) h = (h * 31 + roleId.charCodeAt(i)) >>> 0;
  const hues = [220, 280, 160, 32, 340, 200, 25];
  return `hsla(${hues[h % hues.length]} 50% 88% / 0.9)`;
}

export function DirectoryGroupedContactsTable({
  contacts,
  fromQuery,
  emptyMessage = 'No contacts in this list.',
  emptyDescription = 'Add contacts or adjust the current filters to populate this view.',
}: {
  contacts: DirectoryContactListItem[];
  fromQuery: string;
  emptyMessage?: string;
  emptyDescription?: string;
}) {
  const router = useRouter();
  const groups = useMemo(() => buildGroups(contacts), [contacts]);

  if (contacts.length === 0) {
    return (
      <DirectoryEmptyState title={emptyMessage} description={emptyDescription} id="directory-contacts-table" />
    );
  }

  return (
    <div className="space-y-2" aria-label="Contacts by site" id="directory-contacts-table">
      {groups.map((g) => {
        const roleNames = g.rows.map((c) => c.primary_role?.name);
        const cov = siteRoleCoverageFromRoleNames(roleNames);
        return (
          <Collapsible
            key={g.key}
            defaultOpen
            className="rounded-lg border border-border/80 overflow-hidden bg-background"
          >
            <div className="bg-muted/40 border-b border-border/80 px-2 py-1.5 sm:px-3 sm:py-2 flex items-center justify-between gap-2">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto min-h-8 text-xs font-medium -ml-1 px-1.5"
                >
                  <ChevronDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                  {g.label}
                  <span className="ml-1.5 text-[10px] text-muted-foreground">
                    ({g.rows.length})
                  </span>
                </Button>
              </CollapsibleTrigger>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-muted-foreground">Coverage {cov.percent}%</span>
                <div className="h-1.5 w-16 sm:w-24 rounded-full bg-background overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${cov.percent}%` }}
                  />
                </div>
              </div>
            </div>
            <CollapsibleContent>
              <div className="overflow-x-auto">
                <Table className="w-full min-w-[1040px] text-xs">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] w-[14rem]">Contact</TableHead>
                      <TableHead className="text-[10px] w-36 min-w-0">Title</TableHead>
                      <TableHead className="text-[10px] w-36 min-w-0">Role</TableHead>
                      <TableHead className="text-[10px] min-w-[9rem]">Organization</TableHead>
                      <TableHead className="text-[10px] min-w-[9rem]">Country</TableHead>
                      <TableHead className="text-[10px] w-36">Form</TableHead>
                      <TableHead className="text-[10px] w-28 text-right">Quick Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.rows.map((c) => {
                      const pr = c.primary_role as { id?: string; name?: string } | null;
                      const pi = c.primary_institution;
                      const completeness = getContactCompleteness(c);
                      const missing = completeness.missingFields.slice(0, 2).join(', ');
                      const countryName = getCountryName(c.country_code) ?? '—';
                      return (
                        <TableRow key={c.id} className="h-12">
                          <TableCell className="align-middle">
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="h-7 w-7 rounded-full">
                                <AvatarImage src={c.avatar_url ?? undefined} alt="" />
                                <AvatarFallback className="text-[9px] p-0 bg-muted">
                                  <User className="h-3 w-3" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {c.first_name} {c.last_name}
                                </p>
                                <p
                                  className="text-[10px] text-muted-foreground truncate"
                                  title={c.email ?? undefined}
                                >
                                  {c.email || '—'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="align-middle min-w-0 w-36 max-w-36 pr-1">
                            <span className="text-xs text-muted-foreground truncate block" title={c.title ?? undefined}>
                              {c.title || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="align-middle min-w-0 w-36 max-w-36 pr-1">
                            {pr?.id && pr.name ? (
                              <div className="min-w-0 max-w-full" title={pr.name}>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    'text-[9px] py-0 px-1.5 font-medium border-0',
                                    'max-w-full w-full min-w-0 !shrink !justify-start',
                                    // Badge defaults to whitespace-nowrap shrink-0 w-fit; allow column-bound truncation
                                    '[&>span]:min-w-0 [&>span]:max-w-full [&>span]:truncate'
                                  )}
                                  style={{ backgroundColor: roleBadgeClass(pr.id) }}
                                >
                                  <span>{pr.name}</span>
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="align-middle min-w-0 max-w-[12rem]">
                            <div className="min-w-0">
                              <p className="text-xs truncate" title={pi?.name ?? undefined}>
                                {pi?.name ?? '—'}
                              </p>
                              {c.region ? (
                                <p className="text-[10px] text-muted-foreground truncate" title={c.region}>
                                  {c.region}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="align-middle max-w-[10rem]">
                            <span className="text-xs text-foreground truncate block" title={countryName}>
                              {countryName}
                            </span>
                          </TableCell>
                          <TableCell className="align-middle">
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium tabular-nums text-foreground">
                                  {completeness.percent}%
                                </span>
                                <div
                                  className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"
                                  role="progressbar"
                                  aria-label="Contact form completion"
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-valuenow={completeness.percent}
                                >
                                  <div
                                    className={cn(
                                      'h-full rounded-full transition-[width]',
                                      completeness.complete ? 'bg-emerald-500' : 'bg-sky-500'
                                    )}
                                    style={{ width: `${completeness.percent}%` }}
                                  />
                                </div>
                              </div>
                              {missing ? (
                                <p
                                  className="text-[10px] text-muted-foreground truncate"
                                  title={completeness.missingFields.join(', ')}
                                >
                                  Missing {missing}
                                </p>
                              ) : (
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Complete</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-middle">
                            <div className="flex items-center justify-end gap-0.5">
                              {c.email ? (
                                <Button
                                  asChild
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Send email"
                                >
                                  <a href={`mailto:${c.email}`}>
                                    <Mail className="h-3.5 w-3.5" />
                                  </a>
                                </Button>
                              ) : null}
                              {c.phone ? (
                                <Button
                                  asChild
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Call"
                                >
                                  <a href={`tel:${c.phone}`}>
                                    <Phone className="h-3.5 w-3.5" />
                                  </a>
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-7 shrink-0 gap-1.5 px-2 text-xs font-medium"
                                aria-label={`Open ${c.first_name} ${c.last_name}`}
                                onClick={() =>
                                  router.push(`/protected/directory/contacts/${c.id}${fromQuery}`)
                                }
                              >
                                <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                <span className="whitespace-nowrap">Open profile</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
