'use client';

import { useState, useCallback, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

import type { SubjectVisit, VisitStatus } from '@/lib/types/ctms';
import { VISIT_STATUS_OPTIONS } from '@/lib/types/ctms';
import {
  getSubjectById,
  addSubjectVisit,
  updateSubjectVisit,
  deleteSubjectVisit,
} from '@/lib/actions/subjects';

interface VisitsPanelProps {
  subjectId: string;
  initialVisits: SubjectVisit[];
}

export function VisitsPanel({ subjectId, initialVisits }: VisitsPanelProps) {
  const [visits, setVisits] = useState(initialVisits);
  const [, startTransition] = useTransition();

  const refreshVisits = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getSubjectById(subjectId);
        if (data) setVisits(data.subject_visits);
      } catch {
        toast.error('Failed to refresh visits');
      }
    });
  }, [subjectId]);

  const handleDelete = async (id: string) => {
    const { error } = await deleteSubjectVisit(id, subjectId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Visit deleted');
    refreshVisits();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Visit Schedule</h3>
          <p className="text-sm text-muted-foreground">
            {visits.filter((v) => v.status === 'completed').length} of {visits.length} visits completed.
          </p>
        </div>
        <VisitFormDialog subjectId={subjectId} onSuccess={refreshVisits} />
      </div>

      {visits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm font-medium text-muted-foreground">No visits scheduled</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add visits to track the subject&apos;s schedule.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-[50px]">#</TableHead>
                <TableHead className="text-xs">Visit Name</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Planned Date</TableHead>
                <TableHead className="text-xs">Actual Date</TableHead>
                <TableHead className="text-xs">Window</TableHead>
                <TableHead className="text-xs w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visits.map((visit) => (
                <TableRow key={visit.id}>
                  <TableCell className="text-xs font-medium">{visit.visit_number}</TableCell>
                  <TableCell className="text-xs font-medium">{visit.visit_name}</TableCell>
                  <TableCell>
                    <StatusBadge status={visit.status} className="text-xs" />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(visit.planned_date)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(visit.actual_date)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {visit.window_start && visit.window_end
                      ? `${formatDate(visit.window_start)} – ${formatDate(visit.window_end)}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <VisitFormDialog
                        subjectId={subjectId}
                        visit={visit}
                        onSuccess={refreshVisits}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" />}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Visit</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove &ldquo;{visit.visit_name}&rdquo;.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(visit.id)}>
                              Delete
                            </AlertDialogAction>
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
    </div>
  );
}

const visitSchema = z.object({
  visit_name: z.string().min(1, 'Visit name is required'),
  visit_number: z.coerce.number().min(1, 'Visit number is required'),
  planned_date: z.string().optional(),
  actual_date: z.string().optional(),
  status: z.string().min(1),
  window_start: z.string().optional(),
  window_end: z.string().optional(),
  notes: z.string().optional(),
});

type VisitFormValues = z.infer<typeof visitSchema>;

function VisitFormDialog({
  subjectId,
  visit,
  onSuccess,
}: {
  subjectId: string;
  visit?: SubjectVisit;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = !!visit;

  const form = useForm<VisitFormValues>({
    resolver: zodResolver(visitSchema),
    defaultValues: isEdit
      ? {
          visit_name: visit.visit_name,
          visit_number: visit.visit_number,
          planned_date: visit.planned_date ?? '',
          actual_date: visit.actual_date ?? '',
          status: visit.status,
          window_start: visit.window_start ?? '',
          window_end: visit.window_end ?? '',
          notes: visit.notes ?? '',
        }
      : {
          visit_name: '',
          visit_number: 1,
          planned_date: '',
          actual_date: '',
          status: 'scheduled',
          window_start: '',
          window_end: '',
          notes: '',
        },
  });

  const onSubmit = async (values: VisitFormValues) => {
    if (isEdit) {
      const { error } = await updateSubjectVisit(visit.id, subjectId, {
        ...values,
        status: values.status as VisitStatus,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Visit updated');
    } else {
      const { error } = await addSubjectVisit(
        { subject_id: subjectId, ...values, status: values.status as VisitStatus },
        subjectId
      );
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Visit added');
    }
    setOpen(false);
    form.reset();
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEdit ? (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" />
          ) : (
            <Button size="sm" />
          )
        }
      >
        {isEdit ? (
          <Pencil className="h-3 w-3" />
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Add Visit
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Visit' : 'Add Visit'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the details of this visit.'
              : 'Schedule a new visit for this subject.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Visit Name</Label>
              <Input placeholder="e.g., Screening Visit" {...form.register('visit_name')} />
              {form.formState.errors.visit_name && (
                <p className="text-xs text-destructive">{form.formState.errors.visit_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Visit Number</Label>
              <Input type="number" min={1} {...form.register('visit_number')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(val) => form.setValue('status', val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder="Select Status"
                  getDisplayLabel={(v) => VISIT_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v}
                />
              </SelectTrigger>
              <SelectContent>
                {VISIT_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Window Start</Label>
              <Input type="date" {...form.register('window_start')} />
            </div>
            <div className="space-y-2">
              <Label>Window End</Label>
              <Input type="date" {...form.register('window_end')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Visit notes..." rows={2} {...form.register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Visit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
