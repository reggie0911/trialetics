'use client';

import { Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { InstitutionRow } from '@/lib/types/directory';

import { getCountryName, getOrganizationTypeLabel, type ProfileCopy } from './utils';

const SHORT_DATE = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export interface SiteInformationCardProps {
  institution: InstitutionRow;
  copy: ProfileCopy;
  /** When provided, the parent provides a real timezone label like "Central Time (CT)". */
  timeZoneLabel: string | null;
  /** ISO date strings for status-related dates derived in the parent. */
  qualifiedAt: string | null;
  activatedAt: string | null;
  deactivatedAt: string | null;
  canEdit: boolean;
  onEdit: () => void;
}

export function SiteInformationCard({
  institution,
  copy,
  timeZoneLabel,
  qualifiedAt,
  activatedAt,
  deactivatedAt,
  canEdit,
  onEdit,
}: SiteInformationCardProps) {
  const countryName = getCountryName(institution.country_code);
  const typeLabel = getOrganizationTypeLabel(institution.organization_type);
  const isActive = institution.status === 'active';

  const addressBlock = [
    institution.address_line1,
    institution.address_line2,
    [institution.city, [institution.state_region, institution.postal_code].filter(Boolean).join(' ')]
      .filter(Boolean)
      .join(', '),
    countryName,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <Card className="overflow-hidden rounded-[6px] border border-border/70 py-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-4 py-3">
        <h2 id="institution-information-heading" className="text-sm font-semibold tracking-tight leading-none">
          {copy.infoHeading}
        </h2>
        {canEdit ? (
          <Button type="button" variant="link" size="sm" className="h-7 px-0 text-[11px]" onClick={onEdit}>
            <Pencil className="h-3 w-3" aria-hidden />
            Edit
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="px-4 py-4">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Address">
            <span className="whitespace-pre-line text-xs font-medium leading-snug text-foreground">
              {addressBlock || '—'}
            </span>
          </Field>
          <Field label="Region / State">
            <span className="text-xs font-medium text-foreground">{institution.state_region ?? institution.region ?? '—'}</span>
          </Field>
          <Field label="Country">
            <span className="text-xs font-medium text-foreground">{countryName ?? '—'}</span>
          </Field>
          <Field label="Time Zone">
            <span className="text-xs font-medium text-foreground">{timeZoneLabel ?? '—'}</span>
          </Field>
          <Field label="Status">
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${
                isActive
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200'
              }`}
            >
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </Field>
          <Field label="Type">
            <span className="text-xs font-medium text-foreground">{typeLabel}</span>
          </Field>
          <Field label="Created">
            <span className="text-xs font-medium text-foreground">{formatDate(qualifiedAt)}</span>
          </Field>
          <Field label="Last updated">
            <span className="text-xs font-medium text-foreground">{formatDate(institution.updated_at)}</span>
          </Field>
          <Field label={isActive ? 'Activated' : 'Deactivated'}>
            <span className="text-xs font-medium text-foreground">
              {isActive ? formatDate(activatedAt) : formatDate(deactivatedAt)}
            </span>
          </Field>
        </dl>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return SHORT_DATE.format(d);
  } catch {
    return '—';
  }
}
