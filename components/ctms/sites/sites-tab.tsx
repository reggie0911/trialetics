'use client';

import { useState, useCallback, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Building2, ExternalLink, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useStudyHub } from '@/components/ctms/study-hub-context';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { STUDY_DEACTIVATED_TOOLTIP } from '@/lib/constants/study-deactivated-message';

import type { StudySite } from '@/lib/types/ctms';
import { getStudySites, createSite } from '@/lib/actions/sites';
import { CopilotImportTrigger } from '@/components/copilot/tables/copilot-import-trigger';
import { useClientPagination } from '@/lib/hooks/use-client-pagination';
import { TablePaginationFooter } from '@/components/ui/table-pagination-footer';

const SITES_TABLE_COL_COUNT = 7;

interface SitesTabProps {
  studyId: string;
  initialSites: StudySite[];
}

export function SitesTab({ studyId, initialSites }: SitesTabProps) {
  const router = useRouter();
  const readOnly = useStudyHub()?.isStudyReadOnly ?? false;
  const [sites, setSites] = useState(initialSites);
  const [searchQuery, setSearchQuery] = useState('');
  const [, startTransition] = useTransition();

  const filteredSites = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter((s) => {
      const location = [s.city, s.state].filter(Boolean).join(', ');
      return (
        s.site_number.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.pi_name?.toLowerCase().includes(q) ?? false) ||
        location.toLowerCase().includes(q)
      );
    });
  }, [sites, searchQuery]);

  const pagination = useClientPagination({
    totalItems: filteredSites.length,
    resetKey: [searchQuery],
  });
  const paginatedSites = pagination.paginate(filteredSites);

  const refreshSites = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getStudySites(studyId);
        setSites(data);
      } catch {
        toast.error('Failed to refresh site data');
      }
    });
  }, [studyId]);

  // Bulk-create sites from accepted Copilot proposals. We loop sequentially
  // so a single bad row surfaces a clear error, then refresh the table.
  // Update ops are skipped here for now — the existing per-site detail
  // page is the audited path for edits; an "update existing site" mode can
  // layer on later by wiring updateSite() against the matched id.
  const handleCopilotImport = async (
    rows: { rowIndex: number; values: Record<string, unknown>; op: 'insert' | 'update' }[]
  ) => {
    let createdCount = 0;
    let failedCount = 0;
    for (const row of rows) {
      if (row.op !== 'insert') continue;
      const v = row.values as Record<string, unknown>;
      const targetEnrollmentRaw = v.target_enrollment;
      const targetEnrollment =
        typeof targetEnrollmentRaw === 'number'
          ? targetEnrollmentRaw
          : Number.isFinite(Number(targetEnrollmentRaw))
            ? Number(targetEnrollmentRaw)
            : 0;
      const status = (v.status as
        | 'identified'
        | 'selected'
        | 'initiated'
        | 'activated'
        | 'enrolling'
        | 'closed'
        | undefined) ?? 'identified';
      const result = await createSite({
        study_id: studyId,
        site_number: String(v.site_number ?? '').trim(),
        name: String(v.name ?? '').trim(),
        study_country_id: (v.study_country_id as string | undefined) || undefined,
        address: (v.address as string | undefined) || undefined,
        city: (v.city as string | undefined) || undefined,
        state: (v.state as string | undefined) || undefined,
        postal_code: (v.postal_code as string | undefined) || undefined,
        pi_name: (v.pi_name as string | undefined) || undefined,
        pi_email: (v.pi_email as string | undefined) || undefined,
        pi_directory_contact_id: null,
        status,
        activation_date: (v.activation_date as string | undefined) || undefined,
        target_enrollment: targetEnrollment,
      });
      if (result.error) failedCount += 1;
      else createdCount += 1;
    }
    if (createdCount > 0) toast.success(`${createdCount} site${createdCount === 1 ? '' : 's'} created`);
    if (failedCount > 0) toast.error(`${failedCount} row${failedCount === 1 ? '' : 's'} couldn\u2019t be created`);
    refreshSites();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {readOnly ? (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button size="sm" disabled aria-label="Add site">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Site
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {STUDY_DEACTIVATED_TOOLTIP}
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <CopilotImportTrigger
                tableId="ctms.site-activation"
                tableLabel="Sites"
                studyId={studyId}
                scope={{ kind: 'study', id: studyId }}
                duplicateKey="site_number"
                existingRows={sites.map(s => ({
                  id: s.id,
                  values: {
                    site_number: s.site_number,
                    name: s.name,
                    pi_email: s.pi_email,
                  },
                }))}
                targetFields={[
                  { path: 'site_number', label: 'Site number' },
                  { path: 'name', label: 'Site name' },
                  { path: 'study_country_id', label: 'Country' },
                  { path: 'address', label: 'Address' },
                  { path: 'city', label: 'City' },
                  { path: 'state', label: 'State / Province' },
                  { path: 'postal_code', label: 'Postal code' },
                  { path: 'pi_name', label: 'PI name' },
                  { path: 'pi_email', label: 'PI email' },
                  { path: 'status', label: 'Status' },
                  { path: 'activation_date', label: 'Activation date' },
                  { path: 'target_enrollment', label: 'Target enrollment' },
                ]}
                onApplied={handleCopilotImport}
              />
              <Button
                size="sm"
                render={<Link href={`/protected/studies/${studyId}/sites/new`} />}
                nativeButton={false}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Site
              </Button>
            </>
          )}
        </div>
      </div>

      {sites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No sites added</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add investigator sites to begin the activation process.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Site Number</TableHead>
                <TableHead className="text-xs">Site Name</TableHead>
                <TableHead className="text-xs">Location</TableHead>
                <TableHead className="text-xs">PI</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Target</TableHead>
                <TableHead className="text-xs w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSites.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={SITES_TABLE_COL_COUNT}
                    className="text-xs text-muted-foreground text-center py-6"
                  >
                    No sites match your search.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSites.map((site) => (
                  <TableRow
                    key={site.id}
                    className="cursor-pointer h-[40px]"
                    onClick={() => router.push(`/protected/studies/${studyId}/sites/${site.id}`)}
                  >
                    <TableCell className="text-xs font-medium">
                      {site.site_number}
                    </TableCell>
                    <TableCell className="text-xs">{site.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[site.city, site.state].filter(Boolean).join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {site.pi_name || '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={site.status} className="text-xs" />
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {site.target_enrollment}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        render={<Link href={`/protected/studies/${studyId}/sites/${site.id}`} />}
                        nativeButton={false}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {sites.length > 0 && (
        <TablePaginationFooter
          pagination={pagination}
          totalItems={filteredSites.length}
          itemNoun="site"
        />
      )}
    </div>
  );
}
