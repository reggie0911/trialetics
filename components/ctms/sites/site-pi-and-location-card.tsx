'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ExternalLink,
  Pencil,
  Plus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type SitePiAndLocationCardProps = {
  className?: string;
  readOnly: boolean;
  siteNumber: string | null;
  countryDisplay: string | null;
  studyTitle: string | null;
  addressLine: string | null;
  siteEditHref: string;
  onViewMap: () => void;
  linkedInstitution: {
    id: string;
    name: string;
    status: string;
    organization_type: string;
  } | null;
  onRepairDirectoryOrganization: () => void;
  repairDirectoryOrganizationPending: boolean;
  hasPi: boolean;
  piName: string | null;
  piInitials: string | null;
  mailSection: React.ReactNode;
  onAddPi: () => void;
  onAssignFromContacts: () => void;
};

function defRow(
  label: string,
  value: string | null,
  className?: string,
) {
  if (!value || value.trim() === '') {
    return (
      <div className={cn('grid grid-cols-1 gap-1.5 sm:grid-cols-[7.5rem_1fr] sm:items-start sm:gap-x-4', className)}>
        <dt className="text-[11px] text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="text-[11px] text-foreground/90">—</dd>
      </div>
    );
  }
  return (
    <div className={cn('grid grid-cols-1 gap-1.5 sm:grid-cols-[7.5rem_1fr] sm:items-start sm:gap-x-4', className)}>
      <dt className="text-[11px] text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="break-words text-[11px] font-medium text-foreground sm:pt-0">{value}</dd>
    </div>
  );
}

export function SitePiAndLocationCard({
  className,
  readOnly,
  siteNumber,
  countryDisplay,
  studyTitle,
  addressLine,
  siteEditHref,
  onViewMap,
  linkedInstitution,
  onRepairDirectoryOrganization,
  repairDirectoryOrganizationPending,
  hasPi,
  piName,
  piInitials,
  mailSection,
  onAddPi,
  onAssignFromContacts,
}: SitePiAndLocationCardProps) {
  return (
    <Card
      className={cn(
        'gap-0 overflow-hidden rounded-[5px] border border-border/70 py-0 shadow-sm',
        className,
      )}
    >
      <div className="px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"
          >
            <Building2 className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              data-slot="card-title"
              className="!text-[12px] font-medium leading-tight text-foreground"
            >
              Site &amp; PI Information
            </h2>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Who runs the site, where it is, and the linked study
            </p>
          </div>
        </div>
      </div>
      <CardContent className="p-0 px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="space-y-6 pt-0">
          <section className="space-y-3 text-[11px]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="!text-[12px] font-medium text-foreground">Principal Investigator</h3>
              {hasPi ? (
                <span
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
                >
                  Assigned
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Not Assigned
                </span>
              )}
            </div>

            {hasPi ? (
              <div className="flex items-start gap-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-900 dark:bg-sky-950/50 dark:text-sky-200"
                >
                  {piInitials ?? '—'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-foreground">{piName || '—'}</p>
                  <p className="text-[11px] text-muted-foreground">Principal investigator</p>
                  {mailSection}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 text-[11px] text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
                  onClick={onAssignFromContacts}
                  disabled={readOnly}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full justify-between border-input bg-background px-3 text-[11px] font-normal text-muted-foreground shadow-none hover:bg-muted/50"
                  onClick={onAssignFromContacts}
                  disabled={readOnly}
                >
                  <span>Search and assign PI…</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </Button>

                <div className="relative py-1.5 text-center text-[11px] text-muted-foreground">
                  <div className="absolute inset-0 top-1/2 flex items-center" aria-hidden>
                    <div className="h-px w-full border-t border-border" />
                  </div>
                  <span className="relative bg-card px-2">or</span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="inline-flex h-10 w-full gap-2 border-input bg-card text-[11px] font-medium shadow-sm"
                  onClick={onAddPi}
                  disabled={readOnly}
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                  Add new PI
                </Button>
              </div>
            )}
          </section>

          <section className="space-y-3 border-t border-border/60 pt-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="!text-[12px] font-medium text-foreground">Site Details</h3>
              <Link
                href={siteEditHref}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit
              </Link>
            </div>

            <dl className="space-y-4 text-left text-[11px]">
              {defRow('Site Number', siteNumber?.trim() ? String(siteNumber) : null)}
              {defRow('Country', countryDisplay)}
              {defRow('Study', studyTitle)}
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[7.5rem_1fr] sm:items-start sm:gap-x-4">
                <dt className="text-[11px] text-slate-500 dark:text-slate-400">Directory org</dt>
                <dd className="min-w-0 text-[11px] text-foreground">
                  {linkedInstitution ? (
                    <div className="space-y-1">
                      <Link
                        href={`/protected/directory/institutions/${linkedInstitution.id}`}
                        className="inline-flex min-w-0 max-w-full items-center gap-1.5 font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
                      >
                        <span className="truncate">{linkedInstitution.name}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      </Link>
                      <div className="text-[10px] capitalize text-muted-foreground">
                        {linkedInstitution.organization_type.replace(/_/g, ' ')} · {linkedInstitution.status}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                        <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                        Not linked
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={onRepairDirectoryOrganization}
                        disabled={readOnly || repairDirectoryOrganizationPending}
                      >
                        {repairDirectoryOrganizationPending ? 'Linking…' : 'Create/link organization'}
                      </Button>
                    </div>
                  )}
                </dd>
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[7.5rem_1fr] sm:items-start sm:gap-x-4">
                <dt className="text-[11px] text-slate-500 dark:text-slate-400">Address</dt>
                <dd className="min-w-0 text-[11px] text-foreground">
                  <div className="font-medium break-words">
                    {addressLine && addressLine.trim() !== '' ? addressLine : '—'}
                  </div>
                  {addressLine && addressLine.trim() !== '' ? (
                    <button
                      type="button"
                      onClick={onViewMap}
                      className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
                    >
                      View on map
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  ) : null}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
