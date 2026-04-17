'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Save, RotateCcw, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface AgentInfo {
  id: string;
  name: string;
  description: string;
}

interface Override {
  agent_id: string;
  persona: string | null;
  task_instructions: string | null;
}

export function AIAssistantSettings() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [persona, setPersona] = useState('');
  const [taskInstructions, setTaskInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/ai/chat').then(r => r.json()),
      fetch('/api/ai/overrides').then(r => r.json()),
    ])
      .then(([agentData, overrideData]) => {
        if (agentData.agents) setAgents(agentData.agents);
        if (overrideData.overrides) {
          const map: Record<string, Override> = {};
          for (const o of overrideData.overrides) {
            map[o.agent_id] = o;
          }
          setOverrides(map);
        }
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const selectAgent = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
    const existing = overrides[agentId];
    setPersona(existing?.persona ?? '');
    setTaskInstructions(existing?.task_instructions ?? '');
  }, [overrides]);

  const handleSave = useCallback(async () => {
    if (!selectedAgentId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/ai/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgentId,
          persona: persona || null,
          taskInstructions: taskInstructions || null,
        }),
      });
      const data = await res.json();
      if (data.override) {
        setOverrides(prev => ({ ...prev, [selectedAgentId]: data.override }));
        toast.success('Override saved');
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save override');
    } finally {
      setSaving(false);
    }
  }, [selectedAgentId, persona, taskInstructions]);

  const handleReset = useCallback(async () => {
    if (!selectedAgentId) return;
    const existing = overrides[selectedAgentId];
    if (!existing) {
      setPersona('');
      setTaskInstructions('');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/ai/overrides/${selectedAgentId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setOverrides(prev => {
          const next = { ...prev };
          delete next[selectedAgentId];
          return next;
        });
        setPersona('');
        setTaskInstructions('');
        toast.success('Reset to default');
      } else {
        toast.error(data.error || 'Failed to reset');
      }
    } catch {
      toast.error('Failed to reset override');
    } finally {
      setSaving(false);
    }
  }, [selectedAgentId, overrides]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (selectedAgentId) {
    const agent = agents.find(a => a.id === selectedAgentId);
    const hasOverride = !!overrides[selectedAgentId];
    const isDirty =
      persona !== (overrides[selectedAgentId]?.persona ?? '') ||
      taskInstructions !== (overrides[selectedAgentId]?.task_instructions ?? '');

    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-3 pb-2 border-b shrink-0">
          <button
            onClick={() => setSelectedAgentId(null)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            &larr; All Agents
          </button>
          <h3 className="text-sm font-semibold">{agent?.name}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {agent?.description}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="persona" className="text-xs font-medium">
              Persona
            </Label>
            <Textarea
              id="persona"
              value={persona}
              onChange={e => setPersona(e.target.value)}
              placeholder="e.g., You are a concise expert who uses clinical terminology and responds formally..."
              className="min-h-[100px] text-xs resize-y"
            />
            <p className="text-[10px] text-muted-foreground">
              Define how the assistant should present itself and communicate.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-instructions" className="text-xs font-medium">
              Task Instructions
            </Label>
            <Textarea
              id="task-instructions"
              value={taskInstructions}
              onChange={e => setTaskInstructions(e.target.value)}
              placeholder="e.g., Always format responses as numbered lists. Cite regulatory references when applicable..."
              className="min-h-[100px] text-xs resize-y"
            />
            <p className="text-[10px] text-muted-foreground">
              Specific instructions for how the assistant should handle tasks and format responses.
            </p>
          </div>
        </div>

        <div className="px-4 py-3 border-t shrink-0 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8"
            onClick={handleReset}
            disabled={saving || (!hasOverride && !isDirty)}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
          <Button
            size="sm"
            className="text-xs h-8 flex-1"
            onClick={handleSave}
            disabled={saving || !isDirty}
          >
            {saving ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Save className="h-3 w-3 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2 border-b shrink-0">
        <h3 className="text-sm font-semibold">Agent Customization</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Add a persona and task instructions to customize how each agent responds.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {agents.map(agent => {
          const hasOverride = !!overrides[agent.id];
          return (
            <button
              key={agent.id}
              onClick={() => selectAgent(agent.id)}
              className="w-full text-left px-4 py-2.5 border-b border-border hover:bg-accent transition-colors flex items-center gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium truncate">{agent.name}</span>
                  {hasOverride && (
                    <Check className="h-3 w-3 text-primary flex-shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {agent.description}
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
