'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createGroupTask } from '@/lib/actions/tasks';

const DEPARTMENTS = [
  'Biostatistics',
  'Clinical Affairs',
  'Clinical Finance',
  'Clinical Operations',
  'Clinical Supply',
  'Clinical Systems / IT',
  'Contracts & Legal',
  'Data Management',
  'Drug Safety / Pharmacovigilance',
  'Medical Affairs',
  'Patient Recruitment',
  'Quality Assurance',
  'Regulatory Affairs',
  'Study Start-Up',
  'Vendor Management',
];

const schema = z.object({
  study_id: z.string().min(1, 'Study is required'),
  milestone_name: z.string().min(1, 'Milestone name is required'),
  task_name: z.string().min(1, 'Task / Activity name is required'),
  description: z.string().optional(),
  department: z.string().optional(),
  number_of_individual_tasks: z.coerce.number().min(1).max(500),
  planned_start_date: z.string().optional(),
  planned_due_date: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateGroupTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studies: { id: string; title: string }[];
  onSuccess: () => void;
}

export function CreateGroupTaskModal({
  open,
  onOpenChange,
  studies,
  onSuccess,
}: CreateGroupTaskModalProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      study_id: '',
      milestone_name: '',
      task_name: '',
      description: '',
      department: '',
      number_of_individual_tasks: 1,
      planned_start_date: '',
      planned_due_date: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    const { error } = await createGroupTask({
      study_id: values.study_id,
      milestone_name: values.milestone_name,
      task_name: values.task_name,
      description: values.description || undefined,
      department: values.department || undefined,
      number_of_individual_tasks: values.number_of_individual_tasks,
      planned_start_date: values.planned_start_date || undefined,
      planned_due_date: values.planned_due_date || undefined,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Group task created');
    form.reset();
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Group Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="milestone_name">Milestone Name</Label>
              <Input
                id="milestone_name"
                placeholder="Provide Milestone Name..."
                {...form.register('milestone_name')}
              />
              {form.formState.errors.milestone_name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.milestone_name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="task_name">Task Name</Label>
              <Input
                id="task_name"
                placeholder="Provide Task / Activity Name..."
                {...form.register('task_name')}
              />
              {form.formState.errors.task_name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.task_name.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Provide Description..."
              rows={3}
              {...form.register('description')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="planned_start_date">Planned Start Date</Label>
              <Input
                id="planned_start_date"
                type="date"
                {...form.register('planned_start_date')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planned_due_date">Planned Due Date</Label>
              <Input
                id="planned_due_date"
                type="date"
                {...form.register('planned_due_date')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select Department</Label>
              <Select
                value={form.watch('department') || ''}
                onValueChange={(v) => form.setValue('department', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Department..." />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="number_of_individual_tasks">Number of Individual Tasks</Label>
              <Input
                id="number_of_individual_tasks"
                type="number"
                min={1}
                max={500}
                placeholder="Provide Amount..."
                {...form.register('number_of_individual_tasks')}
              />
              {form.formState.errors.number_of_individual_tasks && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.number_of_individual_tasks.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Study</Label>
            <Select
              value={form.watch('study_id') || ''}
              onValueChange={(v) => form.setValue('study_id', v)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder="Select Study..."
                  getDisplayLabel={(v) => {
                    if (!v) return null;
                    const study = studies.find((s) => s.id === v);
                    return study?.title ?? 'Select Study...';
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                {studies.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.study_id && (
              <p className="text-xs text-destructive">
                {form.formState.errors.study_id.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
