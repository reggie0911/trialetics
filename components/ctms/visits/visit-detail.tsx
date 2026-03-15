'use client';

import { useState, useCallback, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Send,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  TripReportWithAuthor,
  TripReportFinding,
  FollowUpItem,
  FindingSeverity,
  ResolutionStatus,
} from '@/lib/types/ctms';
import {
  VISIT_TYPE_LABEL,
  FINDING_SEVERITY_OPTIONS,
  RESOLUTION_STATUS_OPTIONS,
} from '@/lib/types/ctms';
import {
  getTripReport,
  createTripReport,
  updateTripReport,
  getReportFindings,
  createFinding,
  updateFinding,
  deleteFinding,
  getFollowUpItems,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
} from '@/lib/actions/visits';

interface VisitDetailProps {
  visit: MonitoringVisitWithRelations;
  initialReport: TripReportWithAuthor | null;
  initialFindings: TripReportFinding[];
  initialFollowUps: FollowUpItem[];
}

export function VisitDetail({ visit, initialReport, initialFindings, initialFollowUps }: VisitDetailProps) {
  const [report, setReport] = useState(initialReport);
  const [findings, setFindings] = useState(initialFindings);
  const [followUps, setFollowUps] = useState(initialFollowUps);
  const [, startTransition] = useTransition();

  const refreshReport = useCallback(() => {
    startTransition(async () => {
      try {
        const r = await getTripReport(visit.id);
        setReport(r);
        if (r) {
          const [f, fu] = await Promise.all([
            getReportFindings(r.id),
            getFollowUpItems(r.id),
          ]);
          setFindings(f);
          setFollowUps(fu);
        }
      } catch {
        toast.error('Failed to refresh data');
      }
    });
  }, [visit.id]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const monitorName = visit.profiles
    ? [visit.profiles.first_name, visit.profiles.last_name].filter(Boolean).join(' ') || '—'
    : '—';

  const handleCreateReport = async () => {
    const { error } = await createTripReport(visit.id);
    if (error) { toast.error(error); return; }
    toast.success('Trip report created');
    refreshReport();
  };

  const handleSubmitReport = async () => {
    if (!report) return;
    const { error } = await updateTripReport(report.id, { status: 'submitted' });
    if (error) { toast.error(error); return; }
    toast.success('Report submitted');
    refreshReport();
  };

  const handleApproveReport = async () => {
    if (!report) return;
    const { error } = await updateTripReport(report.id, { status: 'approved' });
    if (error) { toast.error(error); return; }
    toast.success('Report approved');
    refreshReport();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" render={<Link href={`/protected/studies/${visit.study_id}`} />} nativeButton={false} className="-ml-2">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {visit.studies?.title ?? 'Study'}
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {VISIT_TYPE_LABEL[visit.visit_type]} Visit
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{visit.study_sites?.name ?? 'Unknown Site'}</span>
            <span>&middot;</span>
            <StatusBadge status={visit.status} className="text-xs" />
          </div>
        </div>
      </div>

      {/* Visit Details */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Visit Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="divide-y text-sm">
              <div className="grid grid-cols-3 gap-4 py-2">
                <dt className="font-medium text-muted-foreground">Visit Type</dt>
                <dd className="col-span-2">{VISIT_TYPE_LABEL[visit.visit_type]}</dd>
              </div>
              <div className="grid grid-cols-3 gap-4 py-2">
                <dt className="font-medium text-muted-foreground">Site</dt>
                <dd className="col-span-2">{visit.study_sites?.site_number} — {visit.study_sites?.name}</dd>
              </div>
              <div className="grid grid-cols-3 gap-4 py-2">
                <dt className="font-medium text-muted-foreground">Monitor</dt>
                <dd className="col-span-2">{monitorName}</dd>
              </div>
              <div className="grid grid-cols-3 gap-4 py-2">
                <dt className="font-medium text-muted-foreground">Planned Date</dt>
                <dd className="col-span-2">{formatDate(visit.planned_date)}</dd>
              </div>
              <div className="grid grid-cols-3 gap-4 py-2">
                <dt className="font-medium text-muted-foreground">Actual Date</dt>
                <dd className="col-span-2">{formatDate(visit.actual_date)}</dd>
              </div>
              {visit.notes && (
                <div className="grid grid-cols-3 gap-4 py-2">
                  <dt className="font-medium text-muted-foreground">Notes</dt>
                  <dd className="col-span-2 whitespace-pre-wrap">{visit.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Trip Report */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Trip Report</CardTitle>
              {report && report.status === 'draft' && (
                <Button size="sm" variant="outline" onClick={handleSubmitReport}>
                  <Send className="mr-2 h-3 w-3" />Submit
                </Button>
              )}
              {report && report.status === 'submitted' && (
                <Button size="sm" onClick={handleApproveReport}>
                  <CheckCircle2 className="mr-2 h-3 w-3" />Approve
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!report ? (
              <div className="flex flex-col items-center justify-center py-8">
                <FileText className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No trip report yet.</p>
                <Button size="sm" onClick={handleCreateReport}>
                  <Plus className="mr-2 h-4 w-4" />Create Trip Report
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <StatusBadge status={report.status} className="text-xs" />
                  {report.author && (
                    <span className="text-xs text-muted-foreground">
                      by {[report.author.first_name, report.author.last_name].filter(Boolean).join(' ')}
                    </span>
                  )}
                </div>
                <TripReportEditor report={report} onSuccess={refreshReport} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Findings */}
      {report && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Findings ({findings.length})</CardTitle>
              <FindingFormDialog reportId={report.id} onSuccess={refreshReport} />
            </div>
          </CardHeader>
          <CardContent>
            {findings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No findings recorded.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs">Severity</TableHead>
                      <TableHead className="text-xs">Resolution</TableHead>
                      <TableHead className="text-xs w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {findings.map((finding) => (
                      <TableRow key={finding.id}>
                        <TableCell className="text-xs font-medium">{finding.category}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{finding.description}</TableCell>
                        <TableCell>
                          <StatusBadge status={finding.severity} className="text-xs" />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={finding.resolution_status}
                            onValueChange={async (val) => {
                              const { error } = await updateFinding(finding.id, { resolution_status: val as ResolutionStatus });
                              if (error) toast.error(error);
                              else refreshReport();
                            }}
                          >
                            <SelectTrigger className="h-7 w-[110px] text-xs">
                              <SelectValue
                                getDisplayLabel={(v) => RESOLUTION_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {RESOLUTION_STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <FindingFormDialog reportId={report.id} finding={finding} onSuccess={refreshReport} />
                            <AlertDialog>
                              <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" />}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Finding</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently remove this finding.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={async () => { await deleteFinding(finding.id); refreshReport(); }}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Follow-Up Items */}
      {report && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Follow-Up Items ({followUps.length})</CardTitle>
              <FollowUpFormDialog reportId={report.id} onSuccess={refreshReport} />
            </div>
          </CardHeader>
          <CardContent>
            {followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No follow-up items.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs">Assigned To</TableHead>
                      <TableHead className="text-xs">Due Date</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {followUps.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs max-w-[250px] truncate">{item.description}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.profiles
                            ? [item.profiles.first_name, item.profiles.last_name].filter(Boolean).join(' ')
                            : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(item.due_date)}</TableCell>
                        <TableCell>
                          <Select
                            value={item.status}
                            onValueChange={async (val) => {
                              const { error } = await updateFollowUp(item.id, { status: val as ResolutionStatus });
                              if (error) toast.error(error);
                              else refreshReport();
                            }}
                          >
                            <SelectTrigger className="h-7 w-[110px] text-xs">
                              <SelectValue
                                getDisplayLabel={(v) => RESOLUTION_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {RESOLUTION_STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" />}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Follow-Up</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently remove this follow-up item.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={async () => { await deleteFollowUp(item.id); refreshReport(); }}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Trip Report Editor (inline summary/findings editing)

function TripReportEditor({ report, onSuccess }: { report: TripReportWithAuthor; onSuccess: () => void }) {
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState(report.summary ?? '');
  const [reportFindings, setReportFindings] = useState(report.findings ?? '');

  const handleSave = async () => {
    const { error } = await updateTripReport(report.id, { summary, findings: reportFindings });
    if (error) { toast.error(error); return; }
    toast.success('Report updated');
    setEditing(false);
    onSuccess();
  };

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Summary</Label>
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="Visit summary..." />
        </div>
        <div className="space-y-2">
          <Label>General Findings</Label>
          <Textarea value={reportFindings} onChange={(e) => setReportFindings(e.target.value)} rows={3} placeholder="General findings..." />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave}>Save</Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Summary</p>
          {report.status === 'draft' && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-3 w-3" />Edit
            </Button>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap">{report.summary || 'No summary yet.'}</p>
      </div>
      {report.findings && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">General Findings</p>
          <p className="text-sm whitespace-pre-wrap">{report.findings}</p>
        </div>
      )}
    </div>
  );
}

// Finding Form Dialog

const findingSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  severity: z.string().min(1),
  resolution_notes: z.string().optional(),
});

type FindingFormValues = z.infer<typeof findingSchema>;

function FindingFormDialog({
  reportId,
  finding,
  onSuccess,
}: {
  reportId: string;
  finding?: TripReportFinding;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = !!finding;

  const form = useForm<FindingFormValues>({
    resolver: zodResolver(findingSchema),
    defaultValues: isEdit
      ? { category: finding.category, description: finding.description, severity: finding.severity, resolution_notes: finding.resolution_notes ?? '' }
      : { category: '', description: '', severity: 'minor', resolution_notes: '' },
  });

  const onSubmit = async (values: FindingFormValues) => {
    if (isEdit) {
      const { error } = await updateFinding(finding.id, {
        ...values,
        severity: values.severity as FindingSeverity,
      });
      if (error) { toast.error(error); return; }
      toast.success('Finding updated');
    } else {
      const { error } = await createFinding({
        trip_report_id: reportId,
        ...values,
        severity: values.severity as FindingSeverity,
      });
      if (error) { toast.error(error); return; }
      toast.success('Finding added');
    }
    setOpen(false);
    form.reset();
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={isEdit ? <Button variant="ghost" size="sm" className="h-7 w-7 p-0" /> : <Button size="sm" />}>
        {isEdit ? <Pencil className="h-3 w-3" /> : <><Plus className="mr-2 h-4 w-4" />Add Finding</>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Finding' : 'Add Finding'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update finding details.' : 'Record a new finding from this visit.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Input placeholder="e.g., Source Data, Consent, Safety" {...form.register('category')} />
              {form.formState.errors.category && <p className="text-xs text-destructive">{form.formState.errors.category.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={form.watch('severity')} onValueChange={(val) => form.setValue('severity', val)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FINDING_SEVERITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="Describe the finding..." rows={3} {...form.register('description')} />
            {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
          </div>
          {isEdit && (
            <div className="space-y-2">
              <Label>Resolution Notes</Label>
              <Textarea placeholder="Resolution details..." rows={2} {...form.register('resolution_notes')} />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Finding'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Follow-Up Form Dialog

const followUpSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  due_date: z.string().optional(),
});

type FollowUpFormValues = z.infer<typeof followUpSchema>;

function FollowUpFormDialog({ reportId, onSuccess }: { reportId: string; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);

  const form = useForm<FollowUpFormValues>({
    resolver: zodResolver(followUpSchema),
    defaultValues: { description: '', due_date: '' },
  });

  const onSubmit = async (values: FollowUpFormValues) => {
    const { error } = await createFollowUp(reportId, values.description, undefined, values.due_date);
    if (error) { toast.error(error); return; }
    toast.success('Follow-up added');
    setOpen(false);
    form.reset();
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-2 h-4 w-4" />Add Follow-Up
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Follow-Up Item</DialogTitle>
          <DialogDescription>Track an action item from this visit.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="What needs to be done..." rows={3} {...form.register('description')} />
            {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input type="date" {...form.register('due_date')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Add Follow-Up'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
