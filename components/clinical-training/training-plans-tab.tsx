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
import { Plus, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getTrainingPlans,
  getTrainingPlanCriteria,
  getTrainingPlanVersions,
  getTrainingPlanVersionTopics,
  createTrainingPlan,
  updateTrainingPlan,
  deleteTrainingPlan,
  createTrainingPlanCriteria,
  deleteTrainingPlanCriteria,
  createTrainingPlanVersion,
  updateTrainingPlanVersion,
  addTopicToVersion,
  removeTopicFromVersion,
} from '@/lib/actions/training-plans';
import { getActiveTrainingTopics } from '@/lib/actions/training-topics';
import type {
  TrainingPlan,
  TrainingPlanCriteria,
  TrainingPlanVersion,
  TrainingTopic,
} from '@/lib/types/clinical-training';
import { TRAINING_PLAN_VERSION_STATUS_LABELS } from '@/lib/types/clinical-training';

interface TrainingPlansTabProps {
  companyId: string;
}

export function TrainingPlansTab({ companyId }: TrainingPlansTabProps) {
  const { toast } = useToast();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<TrainingPlanCriteria[]>([]);
  const [versions, setVersions] = useState<TrainingPlanVersion[]>([]);
  const [topics, setTopics] = useState<TrainingTopic[]>([]);
  const [versionTopics, setVersionTopics] = useState<{ topic: TrainingTopic }[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TrainingPlan | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [versionFormName, setVersionFormName] = useState('');
  const [showAddTopicDialog, setShowAddTopicDialog] = useState(false);
  const [addTopicId, setAddTopicId] = useState<string>('');

  const loadPlans = useCallback(async () => {
    const result = await getTrainingPlans(companyId);
    if (result.success && result.data) setPlans(result.data);
  }, [companyId]);

  const loadCriteria = useCallback(async () => {
    if (!selectedPlanId) return;
    const result = await getTrainingPlanCriteria(selectedPlanId);
    if (result.success && result.data) setCriteria(result.data);
  }, [selectedPlanId]);

  const loadVersions = useCallback(async () => {
    if (!selectedPlanId) return;
    const result = await getTrainingPlanVersions(selectedPlanId);
    if (result.success && result.data) setVersions(result.data);
  }, [selectedPlanId]);

  const loadVersionTopics = useCallback(async () => {
    if (!selectedVersionId) return;
    const result = await getTrainingPlanVersionTopics(selectedVersionId);
    if (result.success && result.data) setVersionTopics(result.data);
  }, [selectedVersionId]);

  const loadTopics = useCallback(async () => {
    const result = await getActiveTrainingTopics(companyId);
    if (result.success && result.data) setTopics(result.data);
  }, [companyId]);

  useEffect(() => {
    setIsLoading(true);
    loadPlans().then(() => setIsLoading(false));
  }, [loadPlans]);

  useEffect(() => {
    loadCriteria();
    loadVersions();
  }, [selectedPlanId, loadCriteria, loadVersions]);

  useEffect(() => {
    loadVersionTopics();
  }, [selectedVersionId, loadVersionTopics]);

  const openCreatePlan = () => {
    setEditingPlan(null);
    setFormName('');
    setFormDescription('');
    setShowPlanDialog(true);
  };

  const openEditPlan = (p: TrainingPlan) => {
    setEditingPlan(p);
    setFormName(p.name);
    setFormDescription(p.description || '');
    setShowPlanDialog(true);
  };

  const handleSubmitPlan = async () => {
    if (!formName.trim()) {
      toast({ title: 'Validation', description: 'Plan Name is required', variant: 'destructive' });
      return;
    }
    if (editingPlan) {
      const result = await updateTrainingPlan(editingPlan.id, {
        name: formName.trim(),
        description: formDescription.trim() || null,
      });
      if (result.success) {
        toast({ title: 'Success', description: 'Training plan updated' });
        loadPlans();
        setShowPlanDialog(false);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } else {
      const result = await createTrainingPlan({
        company_id: companyId,
        name: formName.trim(),
        description: formDescription.trim() || null,
      });
      if (result.success) {
        toast({ title: 'Success', description: 'Training plan created' });
        loadPlans();
        setShowPlanDialog(false);
        if (result.data) setSelectedPlanId(result.data.id);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Delete this training plan?')) return;
    const result = await deleteTrainingPlan(id);
    if (result.success) {
      toast({ title: 'Success', description: 'Training plan deleted' });
      loadPlans();
      if (selectedPlanId === id) setSelectedPlanId(null);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const openCreateVersion = () => {
    setVersionFormName('');
    setShowVersionDialog(true);
  };

  const handleSubmitVersion = async () => {
    if (!selectedPlanId || !versionFormName.trim()) return;
    const result = await createTrainingPlanVersion({
      training_plan_id: selectedPlanId,
      name: versionFormName.trim(),
    });
    if (result.success) {
      toast({ title: 'Success', description: 'Version created' });
      loadVersions();
      setShowVersionDialog(false);
      if (result.data) setSelectedVersionId(result.data.id);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleApproveVersion = async (v: TrainingPlanVersion) => {
    const result = await updateTrainingPlanVersion(v.id, { status: 'approved' });
    if (result.success) {
      toast({ title: 'Success', description: 'Version approved' });
      loadVersions();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleAddTopicToVersion = async () => {
    if (!selectedVersionId || !addTopicId) return;
    const result = await addTopicToVersion(selectedVersionId, addTopicId);
    if (result.success) {
      toast({ title: 'Success', description: 'Topic added to version' });
      loadVersionTopics();
      setShowAddTopicDialog(false);
      setAddTopicId('');
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleRemoveTopicFromVersion = async (topicId: string) => {
    if (!selectedVersionId) return;
    const result = await removeTopicFromVersion(selectedVersionId, topicId);
    if (result.success) {
      toast({ title: 'Success', description: 'Topic removed' });
      loadVersionTopics();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const selectedVersion = versions.find((v) => v.id === selectedVersionId);
  const existingTopicIds = versionTopics.map((vt) => vt.topic?.id).filter(Boolean);
  const availableTopics = topics.filter((t) => !existingTopicIds.includes(t.id));

  return (
    <div className="flex gap-6">
      <div className="w-80 shrink-0 space-y-4">
        <div>
          <Label className="text-[12px]">Training Plans</Label>
          <div className="mt-2 space-y-1">
            {isLoading ? (
              <p className="text-[12px] text-muted-foreground">Loading...</p>
            ) : plans.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No plans yet</p>
            ) : (
              plans.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded border p-2 cursor-pointer text-[12px] ${
                    selectedPlanId === p.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => {
                    setSelectedPlanId(p.id);
                    setSelectedVersionId(null);
                  }}
                >
                  <span>{p.name}</span>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditPlan(p)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeletePlan(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <Button size="sm" className="mt-2 w-full text-[12px]" onClick={openCreatePlan}>
            <Plus className="mr-1 h-3 w-3" />
            Add Plan
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-6">
        {selectedPlan ? (
          <>
            <div>
              <h3 className="text-sm font-medium mb-2">Versions</h3>
              <div className="space-y-2">
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className={`flex items-center justify-between rounded border p-2 text-[12px] ${
                      selectedVersionId === v.id ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div
                      className="flex items-center gap-2 cursor-pointer flex-1"
                      onClick={() => setSelectedVersionId(v.id)}
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span>v{v.version_number} - {v.name}</span>
                      <span className="text-muted-foreground">({TRAINING_PLAN_VERSION_STATUS_LABELS[v.status as keyof typeof TRAINING_PLAN_VERSION_STATUS_LABELS]})</span>
                    </div>
                    {v.status === 'draft' && (
                      <Button size="sm" variant="outline" className="text-[12px]" onClick={() => handleApproveVersion(v)}>
                        Approve
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button size="sm" className="mt-2 text-[12px]" onClick={openCreateVersion}>
                <Plus className="mr-1 h-3 w-3" />
                Add Version
              </Button>
            </div>

            {selectedVersion && (
              <div>
                <h3 className="text-sm font-medium mb-2">Topics in Version</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[12px]">Topic Name</TableHead>
                      <TableHead className="text-[12px]">Category</TableHead>
                      <TableHead className="text-[12px] w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versionTopics.map((vt) => (
                      <TableRow key={vt.topic?.id}>
                        <TableCell className="text-[12px]">{vt.topic?.name}</TableCell>
                        <TableCell className="text-[12px]">{vt.topic?.category || '—'}</TableCell>
                        <TableCell>
                          {selectedVersion.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => vt.topic && handleRemoveTopicFromVersion(vt.topic.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {selectedVersion.status === 'draft' && (
                  <Button
                    size="sm"
                    className="mt-2 text-[12px]"
                    onClick={() => {
                      loadTopics();
                      setShowAddTopicDialog(true);
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Topic
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Select a training plan to manage versions and topics</p>
        )}
      </div>

      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Training Plan' : 'Add Training Plan'}</DialogTitle>
            <DialogDescription>
              {editingPlan ? 'Update training plan' : 'Create a new training plan'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-[12px]">Plan Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Study XYZ Training"
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)} className="text-[12px]">
              Cancel
            </Button>
            <Button onClick={handleSubmitPlan} className="text-[12px]">
              {editingPlan ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Version</DialogTitle>
            <DialogDescription>Create a new version of this training plan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-[12px]">Version Name</Label>
              <Input
                value={versionFormName}
                onChange={(e) => setVersionFormName(e.target.value)}
                placeholder="e.g. v1.0"
                className="mt-1 text-[12px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersionDialog(false)} className="text-[12px]">
              Cancel
            </Button>
            <Button onClick={handleSubmitVersion} className="text-[12px]">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddTopicDialog} onOpenChange={setShowAddTopicDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Topic to Version</DialogTitle>
            <DialogDescription>Select a training topic to add to this version</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-[12px]">Training Topic</Label>
              <Select value={addTopicId} onValueChange={(v) => setAddTopicId(v ?? '')}>
                <SelectTrigger className="mt-1 text-[12px]">
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  {availableTopics.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-[12px]">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTopicDialog(false)} className="text-[12px]">
              Cancel
            </Button>
            <Button onClick={handleAddTopicToVersion} disabled={!addTopicId} className="text-[12px]">
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
