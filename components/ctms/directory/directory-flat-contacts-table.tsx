'use client';

import { useRouter } from 'next/navigation';
import { Eye, User } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DirectoryContactListItem } from '@/lib/types/directory';
import { cn } from '@/lib/utils';
import { DirectoryEmptyState } from '@/components/ctms/directory/directory-empty-state';
import { getContactCompleteness } from '@/lib/directory/record-completeness';
import { getCountryName } from '@/lib/data/countries';

function roleBadgeClass(roleId: string) {
  let h = 0;
  for (let i = 0; i < roleId.length; i++) h = (h * 31 + roleId.charCodeAt(i)) >>> 0;
  const hues = [220, 280, 160, 32, 340, 200, 25];
  return `hsla(${hues[h % hues.length]} 50% 88% / 0.9)`;
}

export function DirectoryFlatContactsTable({
  contacts,
  fromQuery,
  emptyMessage = 'No contacts in this list.',
  emptyDescription = 'Add contacts or adjust the current filters to populate this view.',
  id = 'directory-contacts-table-all',
}: {
  contacts: DirectoryContactListItem[];
  fromQuery: string;
  emptyMessage?: string;
  emptyDescription?: string;
  /** Stable id for scroll targets / tests when this view is mounted. */
  id?: string;
}) {
  const router = useRouter();

  if (contacts.length === 0) {
    return (
      <DirectoryEmptyState title={emptyMessage} description={emptyDescription} id={id} />
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-lg border bg-background shadow-sm"
      aria-label="All contacts"
      id={id}
    >
      <div className="max-h-[min(60vh,560px)] overflow-y-auto">
        <Table className="w-full min-w-[1100px] text-xs">
          <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] min-w-[9rem]">Contact</TableHead>
              <TableHead className="text-[10px] min-w-[9rem]">Title</TableHead>
              <TableHead className="text-[10px] min-w-[10rem]">Email</TableHead>
              <TableHead className="text-[10px] min-w-[7rem]">Phone</TableHead>
              <TableHead className="text-[10px] w-36 min-w-0">Role</TableHead>
              <TableHead className="text-[10px] min-w-[10rem]">Organization</TableHead>
              <TableHead className="text-[10px] min-w-[9rem]">Country</TableHead>
              <TableHead className="text-[10px] w-36">Form</TableHead>
              <TableHead className="text-[10px] w-28 text-right">Quick Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((c) => {
              const pr = c.primary_role as { id?: string; name?: string } | null;
              const pi = c.primary_institution;
              const completeness = getContactCompleteness(c);
              const missing = completeness.missingFields.slice(0, 2).join(', ');
              const countryName = getCountryName(c.country_code) ?? '—';

              return (
                <TableRow key={c.id} className="h-11">
                  <TableCell className="align-middle">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-7 w-7 shrink-0 rounded-full">
                        <AvatarImage src={c.avatar_url ?? undefined} alt="" />
                        <AvatarFallback className="text-[9px] p-0 bg-muted">
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-xs font-medium truncate" title={`${c.first_name} ${c.last_name}`}>
                        {c.first_name} {c.last_name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="align-middle max-w-[12rem]">
                    <span className="text-xs text-muted-foreground truncate block" title={c.title ?? undefined}>
                      {c.title || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="align-middle max-w-[14rem]">
                    <span className="text-xs text-muted-foreground truncate block" title={c.email ?? undefined}>
                      {c.email || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="align-middle max-w-[10rem]">
                    <span className="text-xs text-muted-foreground truncate block" title={c.phone ?? undefined}>
                      {c.phone || '—'}
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
                  <TableCell className="align-middle min-w-0 max-w-[14rem]">
                    <p className="min-w-0 text-xs truncate" title={pi?.name ?? undefined}>
                      {pi?.name ?? '—'}
                    </p>
                  </TableCell>
                  <TableCell className="align-middle max-w-[10rem]">
                    <span className="text-xs text-foreground truncate block" title={countryName}>
                      {countryName}
                    </span>
                  </TableCell>
                  <TableCell className="align-middle">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium tabular-nums text-foreground">{completeness.percent}%</span>
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
                        <p className="text-[10px] text-muted-foreground truncate" title={completeness.missingFields.join(', ')}>
                          Missing {missing}
                        </p>
                      ) : (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Complete</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="align-middle">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-7 shrink-0 gap-1.5 px-2 text-xs font-medium"
                        aria-label={`Open ${c.first_name} ${c.last_name}`}
                        onClick={() => router.push(`/protected/directory/contacts/${c.id}${fromQuery}`)}
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
    </div>
  );
}
