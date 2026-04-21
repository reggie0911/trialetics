'use client';

import { useState, useCallback, useMemo, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import {
  Plus,
  Pencil,
  Trash2,
  ClipboardCheck,
  CalendarDays,
  FileText,
  ExternalLink,
  Search,
  TableProperties,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VisitCalendar } from './visit-calendar';

import type {
  MonitoringVisitWithRelations,
  MonitoringVisitType,
  MonitoringVisitStatus,
  StudySite,
} from '@/lib/types/ctms';
import {
  VISIT_TYPE_OPTIONS,
  MONITORING_VISIT_STATUS_OPTIONS,
  VISIT_TYPE_LABEL,
} from '@/lib/types/ctms';
import {
  getStudyVisits,
  createVisit,
  updateVisit,
  deleteVisit,
} from '@/lib/actions/visits';
import { useStudyHub } from '@/components/ctms/study-hub-context';
import { STUDY_DEACTIVATED_TOOLTIP } from '@/lib/constants/study-deactivated-message';
import { CopilotImportTrigger } from '@/components/copilot/tables/copilot-import-trigger';
import { CopilotFillTrigger } from '@/components/copilot/forms/copilot-fill-trigger';
import { useClientPagination } from '@/lib/hooks/use-client-pagination';
import { TablePaginationFooter } from '@/components/ui/table-pagination-footer';

const VISITS_TABLE_COL_COUNT = 9;

interface VisitsTabProps {
  studyId: string;
  initialVisits: MonitoringVisitWithRelations[];
  sites: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
}

export function VisitsTab({ studyId, initialVisits, sites }: VisitsTabProps) {
  const readOnly = useStudyHub()?.isStudyReadOnly ?? false;
  const disabledTooltip = readOnly ? STUDY_DEACTIVATED_TOOLTIP : undefined;
  const [visits, setVisits] = useState(initialVisits);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [, startTransition] = useTransition();

  const refreshVisits = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getStudyVisits(studyId);
        setVisits(data);
      } catch {
        toast.error('Failed to refresh visits');
      }
    });
  }, [studyId]);

  const handleDelete = async (id: string) => {
    const { error } = await deleteVisit(id, studyId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Visit deleted');
    refreshVisits();
  };

  // Bulk-create monitoring visits from accepted Copilot proposals.
  // Site references may arrive as site_number / name — resolve them
  // against the available sites before calling the audited createVisit.
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
        if (typeof rawSite !== 'string' || !rawSite) return '';
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
      const visitType = (typeof v.visit_type === 'string' && v.visit_type
        ? v.visit_type
        : 'monitoring') as MonitoringVisitType;
      const status = (typeof v.status === 'string' && v.status
        ? v.status
        : 'planned') as MonitoringVisitStatus;
      const { error } = await createVisit({
        study_id: studyId,
        site_id: targetSiteId,
        visit_type: visitType,
        status,
        planned_date: (v.planned_date as string | undefined) || undefined,
        actual_date: (v.actual_date as string | undefined) || undefined,
        notes: (v.notes as string | undefined) || undefined,
      });
      if (error) failedCount += 1;
      else createdCount += 1;
    }
    if (createdCount > 0) toast.success(`${createdCount} visit${createdCount === 1 ? '' : 's'} scheduled`);
    if (failedCount > 0) toast.error(`${failedCount} row${failedCount === 1 ? '' : 's'} couldn\u2019t be scheduled`);
    refreshVisits();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const monitorName = (visit: MonitoringVisitWithRelations) => {
    if (!visit.profiles) return '—';
    return [visit.profiles.first_name, visit.profiles.last_name].filter(Boolean).join(' ') || '—';
  };

  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (typeFilter !== 'all' && v.visit_type !== typeFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const siteName = (v.study_sites?.name ?? '').toLowerCase();
        const studyTitle = (v.studies?.title ?? '').toLowerCase();
        if (!siteName.includes(s) && !studyTitle.includes(s)) return false;
      }
      return true;
    });
  }, [visits, statusFilter, typeFilter, search]);

  const pagination = useClientPagination({
    totalItems: filteredVisits.length,
    resetKey: [search, statusFilter, typeFilter],
  });
  const paginatedVisits = pagination.paginate(filteredVisits);

  const counts = {
    total: visits.length,
    planned: visits.filter((v) => v.status === 'planned').length,
    confirmed: visits.filter((v) => v.status === 'confirmed').length,
    completed: visits.filter((v) => v.status === 'completed').length,
  };

  const visitStatItems = [
    { label: 'Total', key: 'total' as const, markerColor: null as string | null, statusFilter: 'all' },
    { label: 'Planned', key: 'planned' as const, markerColor: 'bg-amber-500', statusFilter: 'planned' },
    { label: 'Confirmed', key: 'confirmed' as const, markerColor: 'bg-blue-500', statusFilter: 'confirmed' },
    { label: 'Completed', key: 'completed' as const, markerColor: 'bg-emerald-500', statusFilter: 'completed' },
  ];

  return (
    <div className="space-y-4">
      <Card className="rounded-lg">
        <CardContent className="flex flex-wrap items-center gap-4 md:gap-6 py-4">
          {visitStatItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setStatusFilter(item.statusFilter)}
              className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              {item.markerColor && (
                <span className={`h-2 w-4 shrink-0 rounded-full ${item.markerColor}`} aria-hidden />
              )}
              <span>
                {item.label} ({counts[item.key]})
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by site or study..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue
                placeholder="All Statuses"
                getDisplayLabel={(v) => {
                  if (v === 'all') return 'All Statuses';
                  return MONITORING_VISIT_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
                }}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {MONITORING_VISIT_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue
                placeholder="All Types"
                getDisplayLabel={(v) => {
                  if (v === 'all') return 'All Types';
                  return VISIT_TYPE_LABEL[v as MonitoringVisitType] ?? v;
                }}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {VISIT_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!readOnly ? (
            <CopilotImportTrigger
              tableId="ctms.visit-schedule"
              tableLabel="Visits"
              studyId={studyId}
              scope={{ kind: 'study', id: studyId }}
              duplicateKey="planned_date"
              existingRows={visits.map(v => ({
                id: v.id,
                values: {
                  site_id: v.site_id,
                  visit_type: v.visit_type,
                  planned_date: v.planned_date,
                },
              }))}
              targetFields={[
                { path: 'site_id', label: 'Site' },
                { path: 'visit_type', label: 'Visit type' },
                { path: 'planned_date', label: 'Planned date' },
                { path: 'actual_date', label: 'Actual date' },
                { path: 'status', label: 'Status' },
                { path: 'notes', label: 'Notes' },
              ]}
              onApplied={handleCopilotImport}
            />
          ) : null}
          <VisitFormDialog
            studyId={studyId}
            sites={sites}
            onSuccess={refreshVisits}
            readOnly={readOnly}
            disabledTooltip={disabledTooltip}
          />
        </div>
      </div>

      <Tabs tabsId={`visits-tab-${studyId}`} defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">
            <TableProperties className="mr-1.5 h-4 w-4" />
            Table
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarDays className="mr-1.5 h-4 w-4" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-3">
          {visits.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ClipboardCheck className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No monitoring visits found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Schedule monitoring visits to track site performance and compliance.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Site</TableHead>
                    <TableHead className="text-xs">Monitor</TableHead>
                    <TableHead className="text-xs">Planned Date</TableHead>
                    <TableHead className="text-xs">Actual Date</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Report</TableHead>
                    <TableHead className="text-xs w-[50px]" />
                    <TableHead className="text-xs w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVisits.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={VISITS_TABLE_COL_COUNT}
                        className="text-xs text-muted-foreground text-center py-6"
                      >
                        No monitoring visits match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedVisits.map((visit) => {
                    const hasReport = visit.trip_reports && visit.trip_reports.length > 0;
                    return (
                      <TableRow key={visit.id}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {VISIT_TYPE_LABEL[visit.visit_type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {visit.study_sites?.name ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {monitorName(visit)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {formatDate(visit.planned_date)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(visit.actual_date)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={visit.status} className="text-xs" />
                        </TableCell>
                        <TableCell>
                          {hasReport ? (
                            <FileText className="h-4 w-4 text-green-600" />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            render={<Link href={`/protected/studies/${studyId}/visits/${visit.id}`} />}
                            nativeButton={false}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <VisitFormDialog
                              studyId={studyId}
                              sites={sites}
                              visit={visit}
                              onSuccess={refreshVisits}
                              readOnly={readOnly}
                              disabledTooltip={disabledTooltip}
                            />
                            {readOnly ? (
                              <Tooltip>
                                <TooltipTrigger render={<span className="inline-flex" />}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    disabled
                                    aria-label="Delete visit"
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
                                <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" />}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Visit</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete this monitoring visit and any associated trip reports, findings, and follow-up items.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(visit.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {visits.length > 0 && (
            <TablePaginationFooter
              pagination={pagination}
              totalItems={filteredVisits.length}
              itemNoun="visit"
            />
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <VisitCalendar visits={filteredVisits} scopeStudyId={studyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Visit Form Dialog

const visitSchema = z.object({
  site_id: z.string().min(1, 'Site is required'),
  visit_type: z.string().min(1, 'Visit type is required'),
  planned_date: z.string().optional(),
  actual_date: z.string().optional(),
  status: z.string().min(1),
  notes: z.string().optional(),
});

type VisitFormValues = z.infer<typeof visitSchema>;

function VisitFormDialog({
  studyId,
  sites,
  visit,
  onSuccess,
  readOnly = false,
  disabledTooltip,
}: {
  studyId: string;
  sites: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
  visit?: MonitoringVisitWithRelations;
  onSuccess: () => void;
  readOnly?: boolean;
  disabledTooltip?: string;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = !!visit;

  const form = useForm<VisitFormValues>({
    resolver: zodResolver(visitSchema),
    defaultValues: isEdit
      ? {
          site_id: visit.site_id,
          visit_type: visit.visit_type,
          planned_date: visit.planned_date ?? '',
          actual_date: visit.actual_date ?? '',
          status: visit.status,
          notes: visit.notes ?? '',
        }
      : {
          site_id: '',
          visit_type: 'monitoring',
          planned_date: '',
          actual_date: '',
          status: 'planned',
          notes: '',
        },
  });

  const onSubmit = async (values: VisitFormValues) => {
    if (isEdit) {
      const { error } = await updateVisit({
        id: visit.id,
        study_id: studyId,
        ...values,
        visit_type: values.visit_type as MonitoringVisitType,
        status: values.status as MonitoringVisitStatus,
      });
      if (error) { toast.error(error); return; }
      toast.success('Visit updated');
    } else {
      const { error } = await createVisit({
        study_id: studyId,
        ...values,
        visit_type: values.visit_type as MonitoringVisitType,
        status: values.status as MonitoringVisitStatus,
      });
      if (error) { toast.error(error); return; }
      toast.success('Visit scheduled');
    }
    setOpen(false);
    form.reset();
    onSuccess();
  };

  const handleOpenChange = (next: boolean) => {
    if (readOnly && next) return;
    setOpen(next);
  };

  const editTrigger = (
    <DialogTrigger render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={readOnly} />}>
      <Pencil className="h-3 w-3" />
    </DialogTrigger>
  );

  const scheduleTrigger = (
    <DialogTrigger render={<Button size="sm" disabled={readOnly} />}>
      <Plus className="mr-2 h-4 w-4" />
      Schedule Visit
    </DialogTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {isEdit ? (
        readOnly && disabledTooltip ? (
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>{editTrigger}</TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {disabledTooltip}
            </TooltipContent>
          </Tooltip>
        ) : (
          editTrigger
        )
      ) : readOnly && disabledTooltip ? (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>{scheduleTrigger}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs">
            {disabledTooltip}
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>{scheduleTrigger}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs">
            Plan a new monitoring visit for a site on this study.
          </TooltipContent>
        </Tooltip>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Visit' : 'Schedule Monitoring Visit'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update visit details.' : 'Plan a new monitoring visit for a site.'}</DialogDescription>
        </DialogHeader>
        {!isEdit ? (
          <div className="flex justify-end pb-1">
            <CopilotFillTrigger
              schemaId="ctms.visit-schedule"
              schemaLabel="Visit schedule"
              scope={{ kind: 'study', id: studyId }}
              studyId={studyId}
              currentValues={form.getValues() as Record<string, unknown>}
              onApplied={(values) => {
                for (const [path, value] of Object.entries(values)) {
                  // site_id from a document might be a site_number — try to map it.
                  if (path === 'site_id' && typeof value === 'string') {
                    const direct = sites.find(s => s.id === value);
                    const byNumber = direct
                      ? null
                      : sites.find(s => s.site_number.toLowerCase() === value.toLowerCase());
                    const byName = direct || byNumber
                      ? null
                      : sites.find(s => s.name.toLowerCase() === value.toLowerCase());
                    const resolved = direct?.id ?? byNumber?.id ?? byName?.id ?? null;
                    if (resolved) form.setValue('site_id', resolved, { shouldDirty: true, shouldValidate: true });
                    continue;
                  }
                  form.setValue(path as keyof VisitFormValues, value as never, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                }
              }}
            />
          </div>
        ) : null}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Site</Label>
            <Select value={form.watch('site_id')} onValueChange={(val) => form.setValue('site_id', val)}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder="Select Site"
                  getDisplayLabel={(v) => {
                    const s = sites.find((x) => x.id === v);
                    return s ? `${s.site_number} — ${s.name}` : v;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.site_number} — {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.site_id && (
              <p className="text-xs text-destructive">{form.formState.errors.site_id.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Visit Type</Label>
              <Select value={form.watch('visit_type')} onValueChange={(val) => form.setValue('visit_type', val)}>
                <SelectTrigger className="w-full">
                  <SelectValue
                  placeholder="Select Type"
                    getDisplayLabel={(v) => VISIT_TYPE_LABEL[v as MonitoringVisitType] ?? v}
                  />
                </SelectTrigger>
                <SelectContent>
                  {VISIT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.watch('status')} onValueChange={(val) => form.setValue('status', val)}>
                <SelectTrigger className="w-full">
                  <SelectValue
                  placeholder="Select Status"
                    getDisplayLabel={(v) => MONITORING_VISIT_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v}
                  />
                </SelectTrigger>
                <SelectContent>
                  {MONITORING_VISIT_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Planned Date</Label>
              <Input type="date" {...form.register('planned_date')} />
            </div>
            <div className="space-y-2">
              <Label>Actual Date</Label>
              <Input type="date" {...form.register('actual_date')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Visit notes..." rows={2} {...form.register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Schedule Visit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
