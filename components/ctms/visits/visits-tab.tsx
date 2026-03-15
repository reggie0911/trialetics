'use client';

import { useState, useCallback, useTransition } from 'react';
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

interface VisitsTabProps {
  studyId: string;
  initialVisits: MonitoringVisitWithRelations[];
  sites: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
}

export function VisitsTab({ studyId, initialVisits, sites }: VisitsTabProps) {
  const [visits, setVisits] = useState(initialVisits);
  const [statusFilter, setStatusFilter] = useState<string>('all');
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const monitorName = (visit: MonitoringVisitWithRelations) => {
    if (!visit.profiles) return '—';
    return [visit.profiles.first_name, visit.profiles.last_name].filter(Boolean).join(' ') || '—';
  };

  const filteredVisits = statusFilter === 'all'
    ? visits
    : visits.filter((v) => v.status === statusFilter);

  const counts = {
    total: visits.length,
    planned: visits.filter((v) => v.status === 'planned').length,
    confirmed: visits.filter((v) => v.status === 'confirmed').length,
    completed: visits.filter((v) => v.status === 'completed').length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-semibold">{counts.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">Planned</p>
            <p className="text-xl font-semibold">{counts.planned}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">Confirmed</p>
            <p className="text-xl font-semibold">{counts.confirmed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-xl font-semibold">{counts.completed}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
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
        <VisitFormDialog studyId={studyId} sites={sites} onSuccess={refreshVisits} />
      </div>

      {filteredVisits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardCheck className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No monitoring visits</p>
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
                <TableHead className="text-xs w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVisits.map((visit) => {
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          render={<Link href={`/protected/visits/${visit.id}`} />}
                          nativeButton={false}
                        >
                          <FileText className="mr-1 h-3 w-3" />
                          View
                        </Button>
                      ) : visit.status === 'completed' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          render={<Link href={`/protected/visits/${visit.id}`} />}
                          nativeButton={false}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Create
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          render={<Link href={`/protected/visits/${visit.id}`} />}
                          nativeButton={false}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <VisitFormDialog studyId={studyId} sites={sites} visit={visit} onSuccess={refreshVisits} />
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
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
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
}: {
  studyId: string;
  sites: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
  visit?: MonitoringVisitWithRelations;
  onSuccess: () => void;
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
          visit_type: 'routine',
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEdit
            ? <Button variant="ghost" size="sm" className="h-7 w-7 p-0" />
            : <Button size="sm" />
        }
      >
        {isEdit ? <Pencil className="h-3 w-3" /> : <><Plus className="mr-2 h-4 w-4" />Schedule Visit</>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Visit' : 'Schedule Monitoring Visit'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update visit details.' : 'Plan a new monitoring visit for a site.'}</DialogDescription>
        </DialogHeader>
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
                    getDisplayLabel={(v) => VISIT_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v}
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
