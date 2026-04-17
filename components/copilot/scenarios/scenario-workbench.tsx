'use client';

import { useState } from 'react';
import { Loader2, Save, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { ScenarioProjection } from '@/lib/copilot/scenario-builder';

interface SavedScenarioRow {
  id: string;
  name: string;
  prompt: string;
  projection: ScenarioProjection;
  created_at: string;
}

interface Props {
  savedScenarios: SavedScenarioRow[];
}

const SAMPLE_PROMPTS = [
  'What if we add 5 sites in Q2?',
  'What if Study X slips by 6 weeks?',
  'What if dropout rises by 3 percentage points?',
  'What if we cut budget by 15%?',
  'What if enrollment pace improves by 20%?',
];

export function ScenarioWorkbench({ savedScenarios }: Props) {
  const [prompt, setPrompt] = useState(SAMPLE_PROMPTS[0]);
  const [name, setName] = useState('');
  const [projection, setProjection] = useState<ScenarioProjection | null>(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedScenarioRow[]>(savedScenarios);

  const run = async (save = false) => {
    setRunning(!save);
    setSaving(save);
    setError(null);
    try {
      const res = await fetch('/api/ai/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, save, name: name || undefined }),
      });
      const data = (await res.json()) as { projection?: ScenarioProjection; savedId?: string; error?: string };
      if (!res.ok || !data.projection) {
        setError(data.error ?? 'Failed to run scenario');
        return;
      }
      setProjection(data.projection);
      if (save && data.savedId) {
        setHistory((h) => [
          { id: data.savedId!, name: name || `Scenario · ${new Date().toLocaleString()}`, prompt, projection: data.projection!, created_at: new Date().toISOString() },
          ...h,
        ]);
        setName('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setRunning(false);
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="scenario-prompt" className="text-xs">What-if</Label>
          <Textarea
            id="scenario-prompt"
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe a change to model..."
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Try:</span>
          {SAMPLE_PROMPTS.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => setPrompt(sample)}
              className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:border-[var(--copilot-accent)] hover:text-foreground"
            >
              {sample}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => void run(false)} disabled={running || saving}>
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span className="ml-1.5">Run projection</span>
          </Button>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Optional name"
            className="max-w-xs"
          />
          <Button size="sm" variant="outline" onClick={() => void run(true)} disabled={!projection || saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span className="ml-1.5">Save</span>
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {projection && <ProjectionView projection={projection} />}

      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">Saved scenarios</p>
          <ul className="space-y-1.5">
            {history.map((row) => (
              <li key={row.id} className="rounded-md border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-normal">{row.name}</p>
                  <span className="text-[11px] text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">{row.prompt}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProjectionView({ projection }: { projection: ScenarioProjection }) {
  const confidenceClass =
    projection.confidence === 'high'
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
      : projection.confidence === 'low'
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
        : 'bg-muted text-muted-foreground';

  return (
    <div className="space-y-4 rounded-md border bg-background p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-normal capitalize">{projection.inputs.kind.replace(/_/g, ' ')}</p>
        <Badge variant="secondary" className={`text-[10px] capitalize ${confidenceClass}`}>
          {projection.confidence} confidence
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4">Metric</th>
              <th className="py-2 pr-4">Baseline</th>
              <th className="py-2 pr-4">Scenario</th>
              <th className="py-2">Δ</th>
            </tr>
          </thead>
          <tbody>
            {projection.rows.map((row) => (
              <tr key={row.label} className="border-b last:border-0">
                <td className="py-2 pr-4 text-foreground">{row.label}</td>
                <td className="py-2 pr-4 text-muted-foreground">{row.baseline}</td>
                <td className="py-2 pr-4">{row.scenario}</td>
                <td className={`py-2 ${row.changed ? 'text-foreground' : 'text-muted-foreground'}`}>{row.delta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {projection.caveats.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-normal uppercase tracking-wide text-muted-foreground">Assumptions / caveats</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {projection.caveats.map((c, idx) => <li key={idx}>&bull; {c}</li>)}
          </ul>
        </div>
      )}

      {projection.nextActions.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-normal uppercase tracking-wide text-muted-foreground">Next-best actions</p>
          <ul className="space-y-1 text-xs">
            {projection.nextActions.map((a, idx) => (
              <li key={idx}>
                <span className="text-foreground">{a.label}</span>{' '}
                <code className="text-[10px] text-muted-foreground">({a.agentId})</code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
