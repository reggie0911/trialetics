'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { useStudyHub } from '@/components/ctms/study-hub-context';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { STUDY_DEACTIVATED_TOOLTIP } from '@/lib/constants/study-deactivated-message';

import type { StudySite } from '@/lib/types/ctms';
import { getStudySites, deleteSite, createSite } from '@/lib/actions/sites';
import { CopilotImportTrigger } from '@/components/copilot/tables/copilot-import-trigger';

interface SitesTabProps {
  studyId: string;
  initialSites: StudySite[];
}

export function SitesTab({ studyId, initialSites }: SitesTabProps) {
  const router = useRouter();
  const readOnly = useStudyHub()?.isStudyReadOnly ?? false;
  const [sites, setSites] = useState(initialSites);
  const [, startTransition] = useTransition();

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

  const handleDelete = async (id: string) => {
    const { error } = await deleteSite(id, studyId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Site deleted');
    refreshSites();
  };

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Sites</h3>
          <p className="text-sm text-muted-foreground">
            Manage investigator sites participating in this study.
          </p>
        </div>
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
          <div className="flex items-center gap-2">
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
          </div>
        )}
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
                <TableHead className="text-xs w-[60px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((site) => (
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
                    {readOnly ? (
                      <Tooltip>
                        <TooltipTrigger render={<span className="inline-flex" />}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled
                            aria-label="Delete site"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs text-xs">
                          {STUDY_DEACTIVATED_TOOLTIP}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" />
                          }
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Site</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete {site.name} ({site.site_number})
                              and all associated contacts and checklist items. This action
                              cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(site.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
