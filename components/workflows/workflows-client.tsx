'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getWorkflowRules, getWorkflowExecutionLog, toggleWorkflowRule, deleteWorkflowRule } from '@/lib/actions/workflows';
import type { WorkflowRule, WorkflowExecutionLog } from '@/lib/types/workflows';
import { WORKFLOW_TRIGGER_LABELS, WORKFLOW_TARGET_TABLES } from '@/lib/types/workflows';
import { WorkflowRuleForm } from './workflow-rule-form';
import { WorkflowExecutionLogTable } from './workflow-execution-log';

interface WorkflowsClientProps {
  companyId: string;
  profileId: string;
}

export function WorkflowsClient({ companyId, profileId }: WorkflowsClientProps) {
  const [activeTab, setActiveTab] = useState('rules');
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [execLog, setExecLog] = useState<WorkflowExecutionLog[]>([]);
  const [execTotal, setExecTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [rulesRes, logRes] = await Promise.all([
      getWorkflowRules(companyId),
      getWorkflowExecutionLog(companyId),
    ]);
    if (rulesRes.success && rulesRes.data) setRules(rulesRes.data);
    if (logRes.success && logRes.data) {
      setExecLog(logRes.data.entries);
      setExecTotal(logRes.data.total);
    }
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (ruleId: string, active: boolean) => {
    const result = await toggleWorkflowRule(ruleId, active);
    if (result.success) {
      toast({ title: active ? 'Rule activated' : 'Rule deactivated' });
      loadData();
    }
  };

  const handleDelete = async (ruleId: string) => {
    const result = await deleteWorkflowRule(ruleId);
    if (result.success) {
      toast({ title: 'Rule deleted' });
      loadData();
    }
  };

  const getTargetLabel = (table: string) =>
    WORKFLOW_TARGET_TABLES.find((t) => t.value === table)?.label || table;

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading workflows...</div>;
  }

  return (
    <>
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <TabsList>
              <TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger>
              <TabsTrigger value="log">Execution Log</TabsTrigger>
            </TabsList>
            <Button size="sm" onClick={() => setShowCreateForm(true)}>
              <Plus className="mr-1 h-4 w-4" />
              New Rule
            </Button>
          </CardHeader>
          <CardContent>
            <TabsContent value="rules" className="mt-0">
              {rules.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  No workflow rules configured. Create a rule to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{rule.name}</p>
                          <Badge variant={rule.active ? 'default' : 'outline'} className="text-[9px]">
                            {rule.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        {rule.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-muted-foreground">
                            Target: {getTargetLabel(rule.target_table)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Trigger: {WORKFLOW_TRIGGER_LABELS[rule.trigger_type]}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {(rule.actions || []).length} action(s)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={rule.active}
                          onCheckedChange={(checked) => handleToggle(rule.id, checked)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(rule.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="log" className="mt-0">
              <WorkflowExecutionLogTable entries={execLog} total={execTotal} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <WorkflowRuleForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        companyId={companyId}
        onSuccess={() => {
          setShowCreateForm(false);
          loadData();
          toast({ title: 'Workflow rule created' });
        }}
      />
    </>
  );
}
