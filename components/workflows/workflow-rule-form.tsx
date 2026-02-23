'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { createWorkflowRule } from '@/lib/actions/workflows';
import type { WorkflowTriggerType, WorkflowActionType } from '@/lib/types/workflows';
import { WORKFLOW_TRIGGER_LABELS, WORKFLOW_ACTION_LABELS, WORKFLOW_TARGET_TABLES } from '@/lib/types/workflows';

interface WorkflowRuleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess: () => void;
}

interface ActionDraft {
  action_type: WorkflowActionType;
  title: string;
  message: string;
}

export function WorkflowRuleForm({ open, onOpenChange, companyId, onSuccess }: WorkflowRuleFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetTable, setTargetTable] = useState('');
  const [triggerType, setTriggerType] = useState<WorkflowTriggerType>('record_created');
  const [conditionField, setConditionField] = useState('');
  const [conditionValue, setConditionValue] = useState('');
  const [actions, setActions] = useState<ActionDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addAction = () => {
    setActions([...actions, { action_type: 'send_notification', title: '', message: '' }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, updates: Partial<ActionDraft>) => {
    setActions(actions.map((a, i) => i === index ? { ...a, ...updates } : a));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !targetTable) return;
    setIsSubmitting(true);

    const result = await createWorkflowRule({
      name: name.trim(),
      description: description.trim() || undefined,
      target_table: targetTable,
      trigger_type: triggerType,
      trigger_config: conditionField ? {
        field: conditionField,
        new_value: conditionValue,
        condition: 'equals',
      } : {},
      actions: actions.map((a) => ({
        action_type: a.action_type,
        action_config: {
          title: a.title || undefined,
          message: a.message || undefined,
        },
      })),
    });

    setIsSubmitting(false);
    if (result.success) {
      setName('');
      setDescription('');
      setTargetTable('');
      setActions([]);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Workflow Rule</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Rule Name</Label>
            <Input className="mt-1 text-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Notify on critical deviation" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea className="mt-1 text-xs" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Target Table</Label>
              <Select value={targetTable} onValueChange={setTargetTable}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="Select table" /></SelectTrigger>
                <SelectContent>
                  {WORKFLOW_TARGET_TABLES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Trigger Type</Label>
              <Select value={triggerType} onValueChange={(v) => setTriggerType(v as WorkflowTriggerType)}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(WORKFLOW_TRIGGER_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Condition Field (optional)</Label>
              <Input className="mt-1 text-xs" value={conditionField} onChange={(e) => setConditionField(e.target.value)} placeholder="e.g. severity" />
            </div>
            <div>
              <Label className="text-xs">Condition Value</Label>
              <Input className="mt-1 text-xs" value={conditionValue} onChange={(e) => setConditionValue(e.target.value)} placeholder="e.g. critical" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Actions</Label>
              <Button variant="outline" size="sm" onClick={addAction}>
                <Plus className="mr-1 h-3 w-3" />
                Add Action
              </Button>
            </div>
            {actions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No actions configured. Add at least one action.</p>
            ) : (
              <div className="space-y-3">
                {actions.map((action, index) => (
                  <div key={index} className="rounded border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Select
                        value={action.action_type}
                        onValueChange={(v) => updateAction(index, { action_type: v as WorkflowActionType })}
                      >
                        <SelectTrigger className="text-xs w-[200px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(WORKFLOW_ACTION_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => removeAction(index)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <Input
                      className="text-xs"
                      value={action.title}
                      onChange={(e) => updateAction(index, { title: e.target.value })}
                      placeholder="Action title"
                    />
                    <Input
                      className="text-xs"
                      value={action.message}
                      onChange={(e) => updateAction(index, { message: e.target.value })}
                      placeholder="Message / description"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || !name.trim() || !targetTable}>
            {isSubmitting ? 'Creating...' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
