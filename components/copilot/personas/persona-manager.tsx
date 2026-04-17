'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Plus, Save, Star, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CopilotPersona, CopilotTone, CopilotUnits } from '@/lib/copilot/personas';

interface Props {
  initialPersonas: CopilotPersona[];
}

const ROLE_OPTIONS = ['CRA', 'PM', 'CRO_LEAD', 'EXEC', 'BIOSTAT', 'REGULATORY', 'FINANCE', 'MEDICAL', 'OPS'];
const TONE_OPTIONS: CopilotTone[] = ['concise', 'balanced', 'detailed'];
const UNITS_OPTIONS: CopilotUnits[] = ['imperial', 'metric'];

export function PersonaManager({ initialPersonas }: Props) {
  const [personas, setPersonas] = useState<CopilotPersona[]>(initialPersonas);
  const [editing, setEditing] = useState<CopilotPersona | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(async () => {
      const res = await fetch('/api/ai/personas');
      if (res.ok) {
        const j = (await res.json()) as { personas: CopilotPersona[] };
        setPersonas(j.personas);
      }
    });
  };

  const activate = (id: string) => {
    startTransition(async () => {
      const res = await fetch('/api/ai/personas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activate: id }),
      });
      if (res.ok) refresh();
    });
  };

  const startNew = () => {
    setEditing({
      id: '',
      userId: '',
      companyId: '',
      name: 'New persona',
      isActive: false,
      role: null,
      tone: 'balanced',
      timezone: null,
      units: 'metric',
      guardrails: [],
      preferredAgents: [],
      metadata: {},
      createdAt: '',
      updatedAt: '',
    });
  };

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      setError('Name is required.');
      return;
    }
    setError(null);
    const payload = {
      id: editing.id || undefined,
      name: editing.name,
      isActive: editing.isActive,
      role: editing.role,
      tone: editing.tone,
      timezone: editing.timezone,
      units: editing.units,
      guardrails: editing.guardrails,
      preferredAgents: editing.preferredAgents,
    };
    startTransition(async () => {
      const res = await fetch('/api/ai/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? 'Save failed');
        return;
      }
      setEditing(null);
      refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {personas.map(p => (
          <div
            key={p.id}
            className={`flex items-center justify-between gap-3 rounded-md border p-3 ${
              p.isActive ? 'border-[var(--copilot-accent)] bg-muted/30' : ''
            }`}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-normal">{p.name}</p>
                {p.isActive && (
                  <Badge variant="secondary" className="text-[10px]">
                    <CheckCircle2 className="mr-1 h-2.5 w-2.5" /> Active
                  </Badge>
                )}
                {p.role && <Badge variant="outline" className="text-[10px]">{p.role}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                tone: {p.tone} &bull; units: {p.units}
                {p.timezone && ` · ${p.timezone}`}
                {p.guardrails.length > 0 && ` · ${p.guardrails.length} guardrail${p.guardrails.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="flex gap-1.5">
              {!p.isActive && (
                <Button variant="outline" size="sm" onClick={() => activate(p.id)} disabled={isPending}>
                  <Star className="mr-1 h-3 w-3" /> Activate
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>
                Edit
              </Button>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={startNew}>
          <Plus className="mr-1.5 h-3 w-3" /> New persona
        </Button>
      </div>

      {editing && (
        <div className="space-y-3 rounded-md border bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-normal">{editing.id ? 'Edit persona' : 'New persona'}</p>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input
                value={editing.name}
                onChange={e => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>
            <Field label="Role">
              <Select
                value={editing.role ?? '__none__'}
                onValueChange={v => setEditing({ ...editing, role: v === '__none__' ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">(none)</SelectItem>
                  {ROLE_OPTIONS.map(r => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tone">
              <Select
                value={editing.tone}
                onValueChange={v => setEditing({ ...editing, tone: v as CopilotTone })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map(t => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Units">
              <Select
                value={editing.units}
                onValueChange={v => setEditing({ ...editing, units: v as CopilotUnits })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS_OPTIONS.map(u => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Timezone">
              <Input
                value={editing.timezone ?? ''}
                onChange={e => setEditing({ ...editing, timezone: e.target.value || null })}
                placeholder="America/Chicago"
              />
            </Field>
          </div>

          <Field label="Personal guardrails (one per line)">
            <Textarea
              rows={3}
              value={editing.guardrails.join('\n')}
              onChange={e =>
                setEditing({
                  ...editing,
                  guardrails: e.target.value.split('\n').map(s => s.trim()).filter(Boolean),
                })
              }
              placeholder='e.g. "Never propose actions on Friday afternoons"'
            />
          </Field>

          <div className="flex items-center gap-2">
            <input
              id="active-cb"
              type="checkbox"
              checked={editing.isActive}
              onChange={e => setEditing({ ...editing, isActive: e.target.checked })}
            />
            <label htmlFor="active-cb" className="text-xs text-muted-foreground">
              Activate this persona on save
            </label>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button onClick={save} disabled={isPending}>
              <Save className="mr-1.5 h-3.5 w-3.5" /> Save persona
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
