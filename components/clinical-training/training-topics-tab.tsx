'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getTrainingTopics,
  createTrainingTopic,
  updateTrainingTopic,
  deleteTrainingTopic,
} from '@/lib/actions/training-topics';
import type { TrainingTopic } from '@/lib/types/clinical-training';
import { DURATION_UNIT_LABELS, TRAINING_TOPIC_ROLE_LABELS } from '@/lib/types/clinical-training';

interface TrainingTopicsTabProps {
  companyId: string;
}

export function TrainingTopicsTab({ companyId }: TrainingTopicsTabProps) {
  const { toast } = useToast();
  const [topics, setTopics] = useState<TrainingTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TrainingTopic | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMandatory, setFormMandatory] = useState(false);
  const [formDuration, setFormDuration] = useState<string>('');
  const [formDurationUnit, setFormDurationUnit] = useState<string>('');

  const loadTopics = useCallback(async () => {
    setIsLoading(true);
    const result = await getTrainingTopics(companyId);
    if (result.success && result.data) setTopics(result.data);
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const openCreate = () => {
    setEditingTopic(null);
    setFormName('');
    setFormCategory('');
    setFormDescription('');
    setFormMandatory(false);
    setFormDuration('');
    setFormDurationUnit('');
    setShowDialog(true);
  };

  const openEdit = (t: TrainingTopic) => {
    setEditingTopic(t);
    setFormName(t.name);
    setFormCategory(t.category || '');
    setFormDescription(t.description || '');
    setFormMandatory(t.mandatory);
    setFormDuration(t.duration != null ? String(t.duration) : '');
    setFormDurationUnit(t.duration_unit || '');
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast({ title: 'Validation', description: 'Training Topic Name is required', variant: 'destructive' });
      return;
    }
    const duration = formDuration ? parseInt(formDuration, 10) : null;
    const durationUnit = formDurationUnit || null;

    if (editingTopic) {
      const result = await updateTrainingTopic(editingTopic.id, {
        name: formName.trim(),
        category: formCategory.trim() || null,
        description: formDescription.trim() || null,
        mandatory: formMandatory,
        duration,
        duration_unit: durationUnit,
      });
      if (result.success) {
        toast({ title: 'Success', description: 'Training topic updated' });
        loadTopics();
        setShowDialog(false);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } else {
      const result = await createTrainingTopic({
        company_id: companyId,
        name: formName.trim(),
        category: formCategory.trim() || null,
        description: formDescription.trim() || null,
        mandatory: formMandatory,
        duration,
        duration_unit: durationUnit,
      });
      if (result.success) {
        toast({ title: 'Success', description: 'Training topic created' });
        loadTopics();
        setShowDialog(false);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this training topic?')) return;
    const result = await deleteTrainingTopic(id);
    if (result.success) {
      toast({ title: 'Success', description: 'Training topic deleted' });
      loadTopics();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Define training topics (e.g. GCP, Protocol-specific, SOP) for clinical training
        </p>
        <Button size="sm" onClick={openCreate} className="text-[12px]">
          <Plus className="mr-1 h-3 w-3" />
          Add Topic
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : topics.length === 0 ? (
        <p className="text-sm text-muted-foreground">No training topics yet. Add one to get started.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[12px]">Training Topic Name</TableHead>
              <TableHead className="text-[12px]">Category</TableHead>
              <TableHead className="text-[12px]">Mandatory</TableHead>
              <TableHead className="text-[12px]">Duration</TableHead>
              <TableHead className="text-[12px]">Obsolete</TableHead>
              <TableHead className="text-[12px] w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topics.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-[12px]">{t.name}</TableCell>
                <TableCell className="text-[12px]">{t.category || '—'}</TableCell>
                <TableCell className="text-[12px]">{t.mandatory ? 'Yes' : 'No'}</TableCell>
                <TableCell className="text-[12px]">
                  {t.duration != null ? `${t.duration} ${t.duration_unit || ''}` : '—'}
                </TableCell>
                <TableCell className="text-[12px]">{t.obsolete_date ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTopic ? 'Edit Training Topic' : 'Add Training Topic'}</DialogTitle>
            <DialogDescription>
              {editingTopic ? 'Update training topic details' : 'Create a new training topic'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-[12px]">Training Topic Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. GCP Training"
                className="mt-1 text-[12px]"
              />
            </div>
            <div>
              <Label className="text-[12px]">Category</Label>
              <Input
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                placeholder="e.g. GCP, Protocol-specific, SOP"
                className="mt-1 text-[12px]"
              />
            </div>
            <div>
              <Label className="text-[12px]">Description</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description"
                className="mt-1 text-[12px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="mandatory"
                checked={formMandatory}
                onChange={(e) => setFormMandatory(e.target.checked)}
              />
              <Label htmlFor="mandatory" className="text-[12px]">Mandatory</Label>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-[12px]">Duration</Label>
                <Input
                  type="number"
                  min={0}
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  placeholder="e.g. 60"
                  className="mt-1 text-[12px]"
                />
              </div>
              <div className="flex-1">
                <Label className="text-[12px]">Duration Unit</Label>
                <Select value={formDurationUnit} onValueChange={(v) => setFormDurationUnit(v ?? '')}>
                  <SelectTrigger className="mt-1 text-[12px]">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DURATION_UNIT_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-[12px]">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="text-[12px]">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="text-[12px]">
              {editingTopic ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
