'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  FlaskConical,
  MoreHorizontal,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { InstitutionOrganizationType, InstitutionRow } from '@/lib/types/directory';
import {
  ORG_TYPE_GROUP_LABEL,
  ORG_TYPE_GROUP_ORDER,
} from '@/lib/directory/organization-display';
import {
  neutralOrgEnrichment,
  type OrgEnrichment,
  type OrgHealth,
} from '@/lib/directory/live-directory-types';
import { DirectoryEmptyState } from '@/components/ctms/directory/directory-empty-state';

export type OrgGroupColumn =
  | 'org'
  | 'location'
  | 'studies'
  | 'enrollment'
  | 'approval'
  | 'tat'
  | 'lastVisit'
  | 'health'
  | 'actions';

const COLUMNS_BY_TYPE: Partial<Record<InstitutionOrganizationType, OrgGroupColumn[]>> = {
  clinical_site: ['org', 'location', 'studies', 'enrollment', 'lastVisit', 'health', 'actions'],
  irb_ec: ['org', 'location', 'studies', 'approval', 'lastVisit', 'health', 'actions'],
  lab: ['org', 'location', 'studies', 'tat', 'lastVisit', 'health', 'actions'],
};

const DEFAULT_COLUMNS: OrgGroupColumn[] = [
  'org',
  'location',
  'studies',
  'lastVisit',
  'health',
  'actions',
];

type GroupTheme = {
  icon: LucideIcon;
  iconColor: string;
  headerColor: string;
};

const GROUP_THEME: Record<InstitutionOrganizationType, GroupTheme> = {
  clinical_site: {
    icon: Stethoscope,
    iconColor: 'text-sky-600 dark:text-sky-300',
    headerColor: 'text-sky-600 dark:text-sky-300',
  },
  irb_ec: {
    icon: ShieldCheck,
    iconColor: 'text-violet-600 dark:text-violet-300',
    headerColor: 'text-violet-600 dark:text-violet-300',
  },
  lab: {
    icon: FlaskConical,
    iconColor: 'text-emerald-600 dark:text-emerald-300',
    headerColor: 'text-emerald-600 dark:text-emerald-300',
  },
  sponsor: {
    icon: Building2,
    iconColor: 'text-foreground',
    headerColor: 'text-foreground',
  },
  cro: {
    icon: Building2,
    iconColor: 'text-foreground',
    headerColor: 'text-foreground',
  },
  vendor: {
    icon: Building2,
    iconColor: 'text-foreground',
    headerColor: 'text-foreground',
  },
  government: {
    icon: Building2,
    iconColor: 'text-foreground',
    headerColor: 'text-foreground',
  },
  other: {
    icon: Building2,
    iconColor: 'text-muted-foreground',
    headerColor: 'text-foreground',
  },
};

function healthBadge(h: OrgHealth) {
  if (h === 'not_tracked') {
    return {
      label: 'Not tracked',
      className:
        'bg-muted text-muted-foreground border border-border dark:bg-muted/40 dark:text-muted-foreground',
    };
  }
  if (h === 'healthy') {
    return {
      label: 'Healthy',
      className:
        'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
    };
  }
  if (h === 'critical') {
    return {
      label: 'Critical',
      className:
        'bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20',
    };
  }
  return {
    label: 'At Risk',
    className:
      'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20',
  };
}

function progressColor(pct: number): string {
  if (pct >= 60) return 'bg-emerald-500';
  if (pct >= 30) return 'bg-amber-500';
  return 'bg-red-500';
}

function relativeFromNow(iso: string | null): string {
  if (!iso) return 'Not tracked';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Not tracked';
  const now = Date.now();
  const days = Math.max(0, Math.round((now - then) / (1000 * 60 * 60 * 24)));
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  const years = Math.round(days / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Not tracked';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not tracked';
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function formatLocation(inst: InstitutionRow): string {
  const parts = [inst.city, inst.country_code].filter(Boolean);
  return parts.length ? parts.join(', ') : inst.country_code ?? '—';
}

interface OrgGroup {
  type: InstitutionOrganizationType;
  rows: InstitutionRow[];
}

function buildGroups(institutions: InstitutionRow[]): OrgGroup[] {
  const map = new Map<InstitutionOrganizationType, InstitutionRow[]>();
  for (const inst of institutions) {
    const arr = map.get(inst.organization_type) ?? [];
    arr.push(inst);
    map.set(inst.organization_type, arr);
  }
  const ordered: OrgGroup[] = [];
  for (const t of ORG_TYPE_GROUP_ORDER) {
    const rows = map.get(t);
    if (rows && rows.length) ordered.push({ type: t, rows });
  }
  for (const [t, rows] of map) {
    if (!ORG_TYPE_GROUP_ORDER.includes(t)) ordered.push({ type: t, rows });
  }
  return ordered;
}

interface GroupedOrganizationsTableProps {
  institutions: InstitutionRow[];
  fromQuery?: string;
  /**
   * Optional preview cap shown inside each section. When `null`, all rows are shown
   * (and the "View all N" footer link is hidden). Default: 4 rows per group.
   */
  rowsPerGroup?: number | null;
  /** Local row filter — used by KPI / Needs-Attention chips. */
  filter?: { health?: OrgHealth | null };
  enrichmentByInstitutionId?: Record<string, OrgEnrichment>;
}

export function GroupedOrganizationsTable({
  institutions,
  fromQuery = '',
  rowsPerGroup = 4,
  filter,
  enrichmentByInstitutionId = {},
}: GroupedOrganizationsTableProps) {
  const router = useRouter();

  const groups = useMemo(() => {
    const all = buildGroups(institutions);
    if (!filter?.health) return all;
    return all
      .map((g) => ({
        ...g,
        rows: g.rows.filter((r) => enrichmentByInstitutionId[r.id]?.health === filter.health),
      }))
      .filter((g) => g.rows.length > 0);
  }, [institutions, filter, enrichmentByInstitutionId]);

  if (groups.length === 0) {
    return (
      <DirectoryEmptyState
        title="No organizations match the current filter."
        description="Adjust the filters or add organizations to populate this view."
      />
    );
  }

  return (
    <div className="space-y-3" aria-label="Organizations by type">
      {groups.map((g) => (
        <OrgGroupSection
          key={g.type}
          group={g}
          rowsPerGroup={rowsPerGroup}
          fromQuery={fromQuery}
          enrichmentByInstitutionId={enrichmentByInstitutionId}
          onRowOpen={(id) => router.push(`/protected/directory/institutions/${id}${fromQuery}`)}
        />
      ))}
    </div>
  );
}

function OrgGroupSection({
  group,
  rowsPerGroup,
  fromQuery,
  onRowOpen,
  enrichmentByInstitutionId,
}: {
  group: OrgGroup;
  rowsPerGroup: number | null;
  fromQuery: string;
  onRowOpen: (id: string) => void;
  enrichmentByInstitutionId: Record<string, OrgEnrichment>;
}) {
  const labels = ORG_TYPE_GROUP_LABEL[group.type] ?? {
    plural: 'Organizations',
    singular: 'Organization',
  };
  const theme = GROUP_THEME[group.type] ?? GROUP_THEME.other;
  const Icon = theme.icon;
  const total = group.rows.length;
  const visibleRows = rowsPerGroup ? group.rows.slice(0, rowsPerGroup) : group.rows;
  const showViewAll = rowsPerGroup != null && total > visibleRows.length;
  const cols = COLUMNS_BY_TYPE[group.type] ?? DEFAULT_COLUMNS;

  return (
    <Collapsible
      defaultOpen
      className="rounded-lg border border-border/80 overflow-hidden bg-background"
    >
      <div className="bg-muted/30 border-b border-border/80 px-3 py-2 flex items-center justify-between gap-2">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-auto min-h-8 text-xs font-semibold -ml-1 px-1.5 hover:bg-transparent',
              theme.headerColor
            )}
          >
            <ChevronDown className="h-3.5 w-3.5 mr-1 text-muted-foreground shrink-0" />
            <Icon className={cn('h-4 w-4 mr-1.5 shrink-0', theme.iconColor)} />
            <span className="underline-offset-2 hover:underline">{labels.plural}</span>
            <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">({total})</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[860px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {cols.map((c) => (
                  <ColumnHead key={c} col={c} />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((inst) => (
                <OrgRow
                  key={inst.id}
                  inst={inst}
                  cols={cols}
                  fromQuery={fromQuery}
                  enr={enrichmentByInstitutionId[inst.id] ?? neutralOrgEnrichment()}
                  onOpen={onRowOpen}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        {showViewAll ? (
          <div className="px-3 py-2 border-t border-border/60 bg-background">
            <Link
              href={`#${group.type}`}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center"
              onClick={(e) => {
                e.preventDefault();
                toast.message('Switch to All organizations to review the full filtered list.');
              }}
            >
              View all {total} {labels.plural.toLowerCase()}
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </Link>
          </div>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ColumnHead({ col }: { col: OrgGroupColumn }) {
  const map: Record<OrgGroupColumn, { label: string; className?: string }> = {
    org: { label: 'Organization' },
    location: { label: 'Location' },
    studies: { label: 'Study Involvement' },
    enrollment: { label: 'Enrollment' },
    approval: { label: 'Approval Status' },
    tat: { label: 'TAT' },
    lastVisit: { label: 'Last Visit' },
    health: { label: 'Health' },
    actions: { label: 'Actions', className: 'text-right w-[7rem]' },
  };
  const m = map[col];
  return <TableHead className={cn('text-[10px] font-medium', m.className)}>{m.label}</TableHead>;
}

function OrgRow({
  inst,
  cols,
  fromQuery,
  onOpen,
  enr,
}: {
  inst: InstitutionRow;
  cols: OrgGroupColumn[];
  fromQuery: string;
  onOpen: (id: string) => void;
  enr: OrgEnrichment;
}) {
  return (
    <TableRow className="h-12">
      {cols.map((c) => (
        <OrganizationTableCell
          key={c}
          col={c}
          inst={inst}
          enr={enr}
          fromQuery={fromQuery}
          onOpen={onOpen}
        />
      ))}
    </TableRow>
  );
}

export function OrganizationTableCell({
  col,
  inst,
  enr,
  fromQuery,
  onOpen,
  organizationColumnVariant = 'default',
}: {
  col: OrgGroupColumn;
  inst: InstitutionRow;
  enr: OrgEnrichment;
  fromQuery: string;
  onOpen: (id: string) => void;
  /** `nameOnly`: organization name link without type subtitle (flat table has a separate Type column). */
  organizationColumnVariant?: 'default' | 'nameOnly';
}) {
  switch (col) {
    case 'org': {
      const labels = ORG_TYPE_GROUP_LABEL[inst.organization_type] ?? {
        singular: inst.organization_type,
        plural: '',
      };
      return (
        <TableCell className="align-middle max-w-[16rem]">
          <Link
            href={`/protected/directory/institutions/${inst.id}${fromQuery}`}
            className="block min-w-0"
          >
            <p className="text-xs font-medium text-foreground truncate" title={inst.name}>
              {inst.name}
            </p>
            {organizationColumnVariant === 'default' ? (
              <p className="text-[10px] text-muted-foreground truncate">{labels.singular}</p>
            ) : null}
          </Link>
        </TableCell>
      );
    }
    case 'location':
      return (
        <TableCell className="align-middle text-xs text-muted-foreground max-w-[12rem]">
          <span className="block truncate" title={formatLocation(inst)}>
            {formatLocation(inst)}
          </span>
        </TableCell>
      );
    case 'studies': {
      const studies = enr.studyInvolvement;
      const first = studies[0];
      const overflow = Math.max(0, studies.length - 1);
      return (
        <TableCell className="align-middle">
          {first ? (
            <div className="flex items-center gap-1 flex-wrap">
              <Badge
                variant="secondary"
                className="text-[10px] py-0 px-1.5 font-medium border-0 bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
              >
                {first}
              </Badge>
              {overflow > 0 ? (
                <Badge
                  variant="secondary"
                  className="text-[10px] py-0 px-1.5 font-medium border-0 bg-muted text-muted-foreground"
                  title={studies.slice(1).join(', ')}
                >
                  +{overflow}
                </Badge>
              ) : null}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
      );
    }
    case 'enrollment': {
      if (!enr.enrollmentTarget) {
        return (
          <TableCell className="align-middle text-xs text-muted-foreground">Not tracked</TableCell>
        );
      }
      const pct = Math.round((enr.enrollmentCurrent / enr.enrollmentTarget) * 100);
      return (
        <TableCell className="align-middle min-w-[10rem]">
          <div className="flex flex-col gap-1">
            <span className="text-xs tabular-nums text-foreground">
              {enr.enrollmentCurrent} / {enr.enrollmentTarget} ({pct}%)
            </span>
            <div className="h-1.5 w-full max-w-[10rem] rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full', progressColor(pct))}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        </TableCell>
      );
    }
    case 'approval': {
      const status = enr.irbStatus ?? 'not_tracked';
      if (status === 'not_tracked') {
        return <TableCell className="align-middle text-xs text-muted-foreground">Not tracked</TableCell>;
      }
      const date = enr.irbDateISO ? formatDate(enr.irbDateISO) : '—';
      const isApproved = status === 'approved';
      return (
        <TableCell className="align-middle min-w-[10rem]">
          <div className="flex flex-col gap-0.5">
            <Badge
              variant="secondary"
              className={cn(
                'text-[10px] py-0 px-1.5 font-medium border-0 capitalize w-fit',
                isApproved
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200'
              )}
            >
              {status}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {isApproved ? 'Approved' : 'Submitted'} {date}
            </span>
          </div>
        </TableCell>
      );
    }
    case 'tat': {
      if (enr.tatDays == null) {
        return <TableCell className="align-middle text-xs text-muted-foreground">Not tracked</TableCell>;
      }
      return (
        <TableCell className="align-middle min-w-[8rem]">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs tabular-nums text-foreground">TAT: {enr.tatDays} days</span>
            <span className="text-[10px] text-muted-foreground">This month</span>
          </div>
        </TableCell>
      );
    }
    case 'lastVisit':
      return (
        <TableCell className="align-middle min-w-[8rem]">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-foreground">{formatDate(enr.lastVisitISO)}</span>
            <span className="text-[10px] text-muted-foreground">{relativeFromNow(enr.lastVisitISO)}</span>
          </div>
        </TableCell>
      );
    case 'health': {
      const hb = healthBadge(enr.health);
      return (
        <TableCell className="align-middle">
          <span className={cn('inline-flex items-center text-[10px] px-2 py-0.5 rounded-md', hb.className)}>
            {hb.label}
          </span>
        </TableCell>
      );
    }
    case 'actions':
      return (
        <TableCell className="align-middle">
          <div className="flex items-center justify-end gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Open profile"
              onClick={() => onOpen(inst.id)}
              aria-label={`Open ${inst.name}`}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Copy organization name"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inst.name);
                  toast.success('Copied');
                } catch {
                  toast.error('Could not copy');
                }
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="More">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => onOpen(inst.id)} className="cursor-pointer">
                  Open profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => toast.message('Use the Site Visits workflow to schedule monitoring visits.')}
                >
                  <Calendar className="h-3.5 w-3.5 mr-2" />
                  Schedule visit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => toast.message('Open the organization profile to manage study and site links.')}
                >
                  Assign to study
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      );
    default:
      return null;
  }
}

/** Full column set for the flat organizations table (superset). */
export const FLAT_ORGANIZATION_COLUMNS: OrgGroupColumn[] = [
  'org',
  'location',
  'studies',
  'enrollment',
  'approval',
  'tat',
  'lastVisit',
  'health',
  'actions',
];
