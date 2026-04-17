'use client';

import { AlertTriangle, Lightbulb, Loader2 } from 'lucide-react';

import { useCopilotContext } from '@/lib/copilot/context-provider';
import { moduleLabel } from '@/lib/copilot/context-resolver';
import { useCopilotInsights } from '@/lib/copilot/use-copilot-insights';

import { InsightCard } from '../cards/insight-card';
import { RecommendationCard } from '../cards/recommendation-card';

/**
 * Phase 2 Insights tab — fetches `/api/ai/insights` and renders
 * `<InsightCard />` + `<RecommendationCard />` with full trust affordances
 * (confidence, sources, "Why this?", pin, last-refreshed). Empty/loading/
 * error states are handled inline so the user always knows what's happening.
 */
export function CopilotInsightsTab() {
  const { module, studyTitle, pathname } = useCopilotContext();
  const { data, loading, error, refresh } = useCopilotInsights();

  if (loading && !data) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Resolving insights for the {moduleLabel(module).toLowerCase()} page&hellip;
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <AlertTriangle className="mb-2 h-5 w-5 text-amber-500" />
        <p className="text-xs font-medium">Couldn&rsquo;t load insights</p>
        <p className="mt-1 max-w-xs text-[11px] text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-3 rounded-md border border-border bg-background px-3 py-1 text-[11px] hover:bg-muted"
        >
          Try again
        </button>
      </div>
    );
  }

  const insights = data?.insights ?? [];
  const recs = data?.recommendations ?? [];

  if (insights.length === 0 && recs.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
        <div
          className="mb-3 flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: 'color-mix(in oklch, var(--copilot-accent) 12%, transparent)' }}
        >
          <Lightbulb className="h-5 w-5" style={{ color: 'var(--copilot-accent)' }} />
        </div>
        <p className="text-xs font-medium">Nothing to surface here yet</p>
        <p className="mt-1 max-w-xs text-[11px] text-muted-foreground">
          The {moduleLabel(module).toLowerCase()} page
          {studyTitle ? ` (${studyTitle})` : ''} doesn&rsquo;t have enough data for the Copilot to surface
          insights. Try opening a study or revisit after data lands.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-3 py-3">
      {recs.length > 0 ? (
        <section className="mb-3 flex flex-col gap-2">
          <h2 className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recommended
          </h2>
          {recs.map(card => (
            <RecommendationCard
              key={card.id}
              card={card}
              pathname={pathname}
              cached={data?.cached}
              onRefresh={refresh}
            />
          ))}
        </section>
      ) : null}

      {insights.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Insights
          </h2>
          {insights.map(card => (
            <InsightCard
              key={card.id}
              card={card}
              pathname={pathname}
              cached={data?.cached}
              onRefresh={refresh}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}
