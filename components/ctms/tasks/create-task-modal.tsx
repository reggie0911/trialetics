'use client';

import { useEffect } from 'react';
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
import { createTask } from '@/lib/actions/tasks';

const schema = z.object({
  study_id: z.string().min(1, 'Study is required'),
  title: z.string().min(1, 'Task name is required'),
  description: z.string().optional(),
  planned_start_date: z.string().optional(),
  due_date: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  studies: { id: string; title: string }[];
  profileId: string;
}

export function CreateTaskModal({
  open,
  onOpenChange,
  onSuccess,
  studies,
  profileId,
}: CreateTaskModalProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      study_id: '',
      title: '',
      description: '',
      planned_start_date: '',
      due_date: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      study_id: '',
      title: '',
      description: '',
      planned_start_date: '',
      due_date: '',
    });
  }, [open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!profileId) {
      toast.error('Unable to assign task: user not found.');
      return;
    }
    const { error } = await createTask({
      study_id: values.study_id,
      title: values.title,
      description: values.description || undefined,
      planned_start_date: values.planned_start_date || undefined,
      due_date: values.due_date || undefined,
      assigned_to: profileId,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Task created');
    form.reset();
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create a Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    const label = study?.title ?? null;
                    if (!label || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(label))
                      return 'Select Study...';
                    return label.replace(/\b\w/g, (c) => c.toUpperCase());
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

          <div className="space-y-2">
            <Label htmlFor="title">Task Name</Label>
            <Input
              id="title"
              placeholder="Provide Task Title..."
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Task Description</Label>
            <Textarea
              id="description"
              placeholder="Provide Task Description..."
              rows={3}
              {...form.register('description')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="planned_start_date">Start Date</Label>
              <Input
                id="planned_start_date"
                type="date"
                {...form.register('planned_start_date')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                {...form.register('due_date')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
