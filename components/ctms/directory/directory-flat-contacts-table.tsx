'use client';

import { useRouter } from 'next/navigation';
import { Calendar, Mail, MoreHorizontal, Phone, User } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { computeContactHealth } from '@/lib/directory/contact-health';
import type { ContactLastActivity } from '@/lib/directory/live-directory-types';
import type { DirectoryContactListItem } from '@/lib/types/directory';
import { cn } from '@/lib/utils';
import { DirectoryEmptyState } from '@/components/ctms/directory/directory-empty-state';

type HealthKind = 'healthy' | 'needs_update' | 'at_risk';

function healthBadge(health: HealthKind | string | undefined) {
  if (health === 'healthy') {
    return {
      label: 'Healthy',
      className:
        'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
      dot: 'bg-emerald-500',
    };
  }
  if (health === 'at_risk') {
    return {
      label: 'At risk',
      className:
        'bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20',
      dot: 'bg-red-500',
    };
  }
  return {
    label: 'Needs update',
    className:
      'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/20',
    dot: 'bg-amber-500',
  };
}

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
  lastActivityByContactId = {},
}: {
  contacts: DirectoryContactListItem[];
  fromQuery: string;
  emptyMessage?: string;
  emptyDescription?: string;
  /** Stable id for scroll targets / tests when this view is mounted. */
  id?: string;
  lastActivityByContactId?: Record<string, ContactLastActivity>;
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
        <Table className="w-full min-w-[1020px] text-xs">
          <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] min-w-[9rem]">Contact</TableHead>
              <TableHead className="text-[10px] min-w-[10rem]">Email</TableHead>
              <TableHead className="text-[10px] min-w-[7rem]">Phone</TableHead>
              <TableHead className="text-[10px] w-36 min-w-0">Role</TableHead>
              <TableHead className="text-[10px] min-w-[10rem]">Site / Organization</TableHead>
              <TableHead className="text-[10px] w-24">Study Involvement</TableHead>
              <TableHead className="text-[10px] w-32">Last Activity</TableHead>
              <TableHead className="text-[10px] w-28">Health</TableHead>
              <TableHead className="text-[10px] w-28 text-right">Quick Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((c) => {
              const pr = c.primary_role as { id?: string; name?: string } | null;
              const pi = c.primary_institution;
              const st = c.study_enrichment?.study_involvement_active;
              const healthKey = c.study_enrichment
                ? c.study_enrichment.contact_health
                : computeContactHealth(c);
              const dhb = healthBadge(healthKey);
              const lastAct = lastActivityByContactId[c.id];

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
                  <TableCell className="align-middle">
                    {st == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Badge
                        variant={st ? 'default' : 'secondary'}
                        className={cn(
                          'text-[9px]',
                          st && 'bg-sky-100 text-sky-700 border-0 dark:bg-sky-500/15 dark:text-sky-300'
                        )}
                      >
                        {st ? 'Active' : 'Inactive'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground align-middle max-w-[8rem]">
                    {lastAct ? (
                      <div className="min-w-0">
                        <p className="text-xs text-foreground truncate">
                          {lastAct.kind === 'visit'
                            ? `Visit on ${lastAct.date}`
                            : lastAct.kind === 'email'
                              ? `Email on ${lastAct.date}`
                              : 'No recent activity'}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">{lastAct.relative}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="align-middle">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 text-[10px] px-1.5 py-0.5 rounded',
                        dhb.className
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dhb.dot)} aria-hidden />
                      {dhb.label}
                    </span>
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
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Schedule meeting">
                        <Calendar className="h-3.5 w-3.5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="More">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              router.push(`/protected/directory/contacts/${c.id}${fromQuery}`);
                            }}
                          >
                            Open profile
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
