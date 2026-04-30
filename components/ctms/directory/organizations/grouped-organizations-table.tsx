'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Eye,
  FlaskConical,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { InstitutionOrganizationType, InstitutionRow } from '@/lib/types/directory';
import { COUNTRIES } from '@/lib/data/countries';
import {
  ORG_TYPE_GROUP_LABEL,
  ORG_TYPE_GROUP_ORDER,
} from '@/lib/directory/organization-display';
import { DirectoryEmptyState } from '@/components/ctms/directory/directory-empty-state';
import { getOrganizationCompleteness } from '@/lib/directory/record-completeness';

export type OrgGroupColumn =
  | 'org'
  | 'country'
  | 'region'
  | 'status'
  | 'form'
  | 'actions';

const COLUMNS_BY_TYPE: Partial<Record<InstitutionOrganizationType, OrgGroupColumn[]>> = {
  clinical_site: ['org', 'country', 'region', 'status', 'form', 'actions'],
  irb_ec: ['org', 'country', 'region', 'status', 'form', 'actions'],
  lab: ['org', 'country', 'region', 'status', 'form', 'actions'],
};

const DEFAULT_COLUMNS: OrgGroupColumn[] = [
  'org',
  'country',
  'region',
  'status',
  'form',
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

const COUNTRY_NAME_BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country.name]));

function formatCountryName(countryCode: string | null): string {
  if (!countryCode) return '—';
  const normalizedCode = countryCode.trim().toUpperCase();
  return COUNTRY_NAME_BY_CODE.get(normalizedCode) ?? countryCode;
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
}

export function GroupedOrganizationsTable({
  institutions,
  fromQuery = '',
  rowsPerGroup = 4,
}: GroupedOrganizationsTableProps) {
  const router = useRouter();

  const groups = useMemo(() => {
    return buildGroups(institutions);
  }, [institutions]);

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
}: {
  group: OrgGroup;
  rowsPerGroup: number | null;
  fromQuery: string;
  onRowOpen: (id: string) => void;
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
          <Table className="w-full min-w-[840px]">
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
    country: { label: 'Country' },
    region: { label: 'Region' },
    status: { label: 'Status' },
    form: { label: 'Form' },
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
}: {
  inst: InstitutionRow;
  cols: OrgGroupColumn[];
  fromQuery: string;
  onOpen: (id: string) => void;
}) {
  return (
    <TableRow className="h-12">
      {cols.map((c) => (
        <OrganizationTableCell
          key={c}
          col={c}
          inst={inst}
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
  fromQuery,
  onOpen,
}: {
  col: OrgGroupColumn;
  inst: InstitutionRow;
  fromQuery: string;
  onOpen: (id: string) => void;
}) {
  switch (col) {
    case 'org':
      return (
        <TableCell className="align-middle max-w-[16rem]">
          <Link
            href={`/protected/directory/institutions/${inst.id}${fromQuery}`}
            className="block min-w-0"
          >
            <p className="text-xs font-medium text-foreground truncate" title={inst.name}>
              {inst.name}
            </p>
          </Link>
        </TableCell>
      );
    case 'country':
      const countryName = formatCountryName(inst.country_code);
      return (
        <TableCell className="align-middle text-xs text-foreground max-w-[8rem]">
          <span className="block truncate" title={countryName}>
            {countryName}
          </span>
        </TableCell>
      );
    case 'region':
      return (
        <TableCell className="align-middle text-xs text-muted-foreground max-w-[10rem]">
          <span className="block truncate" title={inst.region ?? '—'}>
            {inst.region ?? '—'}
          </span>
        </TableCell>
      );
    case 'status':
      return (
        <TableCell className="align-middle">
          <Badge
            variant={inst.status === 'active' ? 'default' : 'secondary'}
            className={cn(
              'text-[10px] capitalize',
              inst.status === 'active' && 'bg-sky-100 text-sky-700 border-0 dark:bg-sky-500/15 dark:text-sky-300'
            )}
          >
            {inst.status}
          </Badge>
        </TableCell>
      );
    case 'form': {
      const completeness = getOrganizationCompleteness(inst);
      const missing = completeness.missingFields.slice(0, 2).join(', ');
      return (
        <TableCell className="align-middle">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium tabular-nums text-foreground">{completeness.percent}%</span>
              <div
                className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="Organization form completion"
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
      );
    }
    case 'actions':
      return (
        <TableCell className="align-middle">
          <div className="flex items-center justify-end gap-0.5">
            <Button
              type="button"
              variant="ghost"
              className="h-7 shrink-0 gap-1.5 px-2 text-xs font-medium"
              onClick={() => onOpen(inst.id)}
              aria-label={`Open ${inst.name}`}
            >
              <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="whitespace-nowrap">Open profile</span>
            </Button>
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
  'country',
  'region',
  'status',
  'form',
  'actions',
];
