'use client';

import { useState } from 'react';
import { Loader2, Save, Sparkles, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { ReportSpec } from '@/lib/copilot/nl-report-builder';

interface SavedDefinitionRow {
  id: string;
  name: string;
  prompt: string;
  spec: ReportSpec;
  created_at: string;
  updated_at: string;
}

interface Props {
  savedDefinitions: SavedDefinitionRow[];
}

const SAMPLE_PROMPTS = [
  'Show enrollment by country across active oncology studies',
  'Sites with enrollment < 50%, grouped by country, bar chart',
  'Total payment amount by site for closed studies',
  'Open deviations by status, pie chart',
  'New subjects per month for the last 12 months, line chart',
];

export function ReportBuilder({ savedDefinitions }: Props) {
  const [prompt, setPrompt] = useState(SAMPLE_PROMPTS[0]);
  const [name, setName] = useState('');
  const [spec, setSpec] = useState<ReportSpec | null>(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedDefinitionRow[]>(savedDefinitions);

  const build = async (save = false) => {
    setRunning(!save);
    setSaving(save);
    setError(null);
    try {
      const res = await fetch('/api/ai/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, save, name: name || undefined }),
      });
      const data = (await res.json()) as { spec?: ReportSpec; savedId?: string; error?: string };
      if (!res.ok || !data.spec) {
        setError(data.error ?? 'Failed to build report');
        return;
      }
      setSpec(data.spec);
      if (save && data.savedId) {
        const now = new Date().toISOString();
        setHistory((h) => [
          {
            id: data.savedId!,
            name: name || data.spec!.headline.slice(0, 80),
            prompt,
            spec: data.spec!,
            created_at: now,
            updated_at: now,
          },
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

  const remove = async (id: string) => {
    const res = await fetch(`/api/ai/reports?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) {
      setHistory((h) => h.filter((d) => d.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="report-prompt" className="text-xs">Describe the report</Label>
          <Textarea
            id="report-prompt"
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. enrollment by country for active oncology studies"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Try:</span>
          {SAMPLE_PROMPTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPrompt(s)}
              className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:border-[var(--copilot-accent)] hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => void build(false)} disabled={running || saving}>
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span className="ml-1.5">Preview</span>
          </Button>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Optional name"
            className="max-w-xs"
          />
          <Button size="sm" variant="outline" onClick={() => void build(true)} disabled={!spec || saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span className="ml-1.5">Save definition</span>
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {spec && <SpecView spec={spec} />}

      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">Saved definitions</p>
          <ul className="space-y-1.5">
            {history.map((row) => (
              <li key={row.id} className="rounded-md border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-normal">{row.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">{new Date(row.updated_at).toLocaleString()}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => void remove(row.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
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

function SpecView({ spec }: { spec: ReportSpec }) {
  return (
    <div className="space-y-3 rounded-md border bg-background p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-normal">{spec.headline}</p>
        <Badge variant="outline" className="text-[10px] capitalize">{spec.chart}</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-[11px] font-normal uppercase tracking-wide text-muted-foreground">Entity</p>
          <p className="text-sm capitalize">{spec.entity}</p>

          <p className="pt-1 text-[11px] font-normal uppercase tracking-wide text-muted-foreground">Metrics</p>
          <ul className="space-y-0.5 text-sm">
            {spec.metrics.map((m) => (
              <li key={m.id}>
                <code className="text-[11px] text-muted-foreground">{m.aggregation}</code> &middot; {m.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] font-normal uppercase tracking-wide text-muted-foreground">Filters</p>
          {spec.filters.length === 0 ? (
            <p className="text-xs text-muted-foreground">None</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {spec.filters.map((f, idx) => (
                <li key={idx}>
                  <Badge variant="secondary" className="text-[10px]">{f.display}</Badge>
                </li>
              ))}
            </ul>
          )}

          <p className="pt-1 text-[11px] font-normal uppercase tracking-wide text-muted-foreground">Group by</p>
          {spec.groupBy.length === 0 ? (
            <p className="text-xs text-muted-foreground">None</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {spec.groupBy.map((g, idx) => <li key={idx}><Badge variant="outline" className="text-[10px]">{g}</Badge></li>)}
            </ul>
          )}
        </div>
      </div>

      {spec.caveats.length > 0 && (
        <div className="space-y-1 pt-1">
          <p className="text-[11px] font-normal uppercase tracking-wide text-muted-foreground">Caveats</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {spec.caveats.map((c, idx) => <li key={idx}>&bull; {c}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
