'use client';

import { useState, useMemo, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

import type {
  SubjectWithSite,
  EnrollmentFunnelData,
  StudySite,
  SubjectStatus,
} from '@/lib/types/ctms';
import { SUBJECT_STATUS_OPTIONS } from '@/lib/types/ctms';
import {
  getStudySubjects,
  getEnrollmentFunnel,
  getEnrollmentFunnelForSite,
  deleteSubject,
  createSubject,
} from '@/lib/actions/subjects';
import { useStudyHub } from '@/components/ctms/study-hub-context';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { STUDY_DEACTIVATED_TOOLTIP } from '@/lib/constants/study-deactivated-message';
import { CopilotImportTrigger } from '@/components/copilot/tables/copilot-import-trigger';

import { EnrollmentFunnel } from './enrollment-funnel';
import { SubjectFormDialog } from './subject-form-dialog';

interface SubjectsTabProps {
  studyId: string;
  initialSubjects: SubjectWithSite[];
  initialFunnel: EnrollmentFunnelData;
  sites: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
  /** When set, list and funnel are scoped to this clinical site */
  siteScopeId?: string;
}

export function SubjectsTab({
  studyId,
  initialSubjects,
  initialFunnel,
  sites,
  siteScopeId,
}: SubjectsTabProps) {
  const router = useRouter();
  const readOnly = useStudyHub()?.isStudyReadOnly ?? false;
  const disabledTooltip = readOnly ? STUDY_DEACTIVATED_TOOLTIP : undefined;
  const [subjects, setSubjects] = useState(initialSubjects);
  const [funnel, setFunnel] = useState(initialFunnel);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [, startTransition] = useTransition();

  const refreshData = useCallback(() => {
    startTransition(async () => {
      try {
        const [subs, funnelData] = siteScopeId
          ? await Promise.all([
              getStudySubjects(studyId, { siteId: siteScopeId }),
              getEnrollmentFunnelForSite(siteScopeId),
            ])
          : await Promise.all([
              getStudySubjects(studyId),
              getEnrollmentFunnel(studyId),
            ]);
        setSubjects(subs);
        setFunnel(funnelData);
        router.refresh();
      } catch {
        toast.error('Failed to refresh subject data');
      }
    });
  }, [studyId, siteScopeId, router]);

  const filteredSubjects = useMemo(() => {
    let result = subjects;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.subject_number.toLowerCase().includes(q) ||
          (s.screening_number?.toLowerCase().includes(q) ?? false) ||
          (s.randomization_number?.toLowerCase().includes(q) ?? false)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (!siteScopeId && siteFilter !== 'all') {
      result = result.filter((s) => s.site_id === siteFilter);
    }

    return result;
  }, [subjects, searchQuery, statusFilter, siteFilter, siteScopeId]);

  // Bulk-create subjects from accepted Copilot proposals. We resolve site
  // references against the available sites first (Copilot may return a
  // site_number, name, or label instead of the canonical UUID), then call
  // the existing audited `createSubject` action per row.
  const handleCopilotImport = async (
    rows: { rowIndex: number; values: Record<string, unknown>; op: 'insert' | 'update' }[]
  ) => {
    let createdCount = 0;
    let failedCount = 0;
    for (const row of rows) {
      if (row.op !== 'insert') continue;
      const v = row.values as Record<string, unknown>;

      const rawSite = v.site_id;
      const targetSiteId = (() => {
        if (typeof rawSite !== 'string' || !rawSite) {
          return siteScopeId ?? '';
        }
        if (sites.some(s => s.id === rawSite)) return rawSite;
        const byNumber = sites.find(s => s.site_number.toLowerCase() === rawSite.toLowerCase());
        if (byNumber) return byNumber.id;
        const byName = sites.find(s => s.name.toLowerCase() === rawSite.toLowerCase());
        if (byName) return byName.id;
        return '';
      })();

      if (!targetSiteId) {
        failedCount += 1;
        continue;
      }

      const status = (typeof v.status === 'string' && v.status
        ? v.status
        : 'pre_screening') as SubjectStatus;

      const { error } = await createSubject({
        study_id: studyId,
        site_id: targetSiteId,
        subject_number: String(v.subject_number ?? '').trim(),
        screening_number: (v.screening_number as string | undefined) || undefined,
        randomization_number: (v.randomization_number as string | undefined) || undefined,
        status,
        screening_date: (v.screening_date as string | undefined) || undefined,
        randomization_date: (v.randomization_date as string | undefined) || undefined,
      });
      if (error) failedCount += 1;
      else createdCount += 1;
    }
    if (createdCount > 0) toast.success(`${createdCount} subject${createdCount === 1 ? '' : 's'} enrolled`);
    if (failedCount > 0) toast.error(`${failedCount} row${failedCount === 1 ? '' : 's'} couldn\u2019t be enrolled`);
    refreshData();
  };

  const handleDelete = async (id: string, subjectSiteId: string | null) => {
    const { error } = await deleteSubject(
      id,
      studyId,
      siteScopeId ?? subjectSiteId ?? undefined
    );
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Subject deleted');
    refreshData();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    statusFilter !== 'all' ||
    (!siteScopeId && siteFilter !== 'all');

  return (
    <div className="space-y-4">
      <EnrollmentFunnel data={funnel} />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Subjects</h3>
          <p className="text-sm text-muted-foreground">
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''}{' '}
            {siteScopeId ? 'at this site.' : 'enrolled in this study.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!readOnly ? (
            <CopilotImportTrigger
              tableId="ctms.subject"
              tableLabel="Subjects"
              studyId={studyId}
              scope={{ kind: 'study', id: studyId }}
              duplicateKey="subject_number"
              existingRows={subjects.map(s => ({
                id: s.id,
                values: {
                  subject_number: s.subject_number,
                  screening_number: s.screening_number,
                  randomization_number: s.randomization_number,
                },
              }))}
              targetFields={[
                { path: 'subject_number', label: 'Subject number' },
                { path: 'site_id', label: 'Site' },
                { path: 'screening_number', label: 'Screening number' },
                { path: 'randomization_number', label: 'Randomization number' },
                { path: 'status', label: 'Status' },
                { path: 'screening_date', label: 'Screening date' },
                { path: 'randomization_date', label: 'Randomization date' },
              ]}
              onApplied={handleCopilotImport}
            />
          ) : null}
          <SubjectFormDialog
            studyId={studyId}
            sites={sites}
            onSuccess={refreshData}
            defaultSiteIdWhenCreate={siteScopeId}
            lockSiteSelection={Boolean(siteScopeId)}
            disabled={readOnly}
            disabledTooltip={disabledTooltip}
          />
        </div>
      </div>

      <div className="flex flex-1 items-center gap-2 flex-wrap">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue
              placeholder="Status"
              getDisplayLabel={(v) => {
                if (v === 'all') return 'All Statuses';
                return SUBJECT_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
              }}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {SUBJECT_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!siteScopeId && sites.length > 0 && (
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue
                placeholder="Site"
                getDisplayLabel={(v) => {
                  if (v === 'all') return 'All Sites';
                  return sites.find((s) => s.id === v)?.site_number ?? v;
                }}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.site_number}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setSiteFilter('all');
            }}
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {filteredSubjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {hasActiveFilters ? 'No subjects match your filters' : 'No subjects enrolled'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {hasActiveFilters
                ? 'Try adjusting your search or filters.'
                : 'Enroll subjects to begin tracking their lifecycle.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Subject Number</TableHead>
                <TableHead className="text-xs">Screening Number</TableHead>
                <TableHead className="text-xs">Randomization Number</TableHead>
                {!siteScopeId && <TableHead className="text-xs">Site</TableHead>}
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Screening Date</TableHead>
                <TableHead className="text-xs">Randomization Date</TableHead>
                <TableHead className="text-xs w-[60px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubjects.map((subject) => (
                <TableRow
                  key={subject.id}
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(`/protected/studies/${studyId}/subjects/${subject.id}`)
                  }
                >
                  <TableCell className="text-xs font-medium">
                    {subject.subject_number}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {subject.screening_number || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {subject.randomization_number || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {subject.study_sites?.site_number ?? '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={subject.status} className="text-xs" />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(subject.screening_date)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(subject.randomization_date)}
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
                            aria-label="Delete subject"
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
                            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete subject {subject.subject_number}
                              and all associated visits and milestones.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(subject.id, subject.site_id)}
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
