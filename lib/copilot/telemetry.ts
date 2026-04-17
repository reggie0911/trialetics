import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Copilot usage telemetry. Cheap to write, easy to ignore on failure.
 *
 * Recorded events power Phase 5's `/protected/copilot/admin/telemetry` page:
 * panel opens, tab switches, card clicks/pins, recommendation accept rate,
 * agent latency, etc.
 *
 * Important: telemetry is NOT a substitute for the audit log. Audit captures
 * GxP "who did what when why"; telemetry captures product analytics.
 */

export type CopilotTelemetryEvent =
  | 'panel_opened'
  | 'panel_closed'
  | 'tab_changed'
  | 'card_clicked'
  | 'card_pinned'
  | 'card_unpinned'
  | 'card_dismissed'
  | 'recommendation_accepted'
  | 'recommendation_dismissed'
  | 'action_run'
  | 'briefing_viewed'
  | 'briefing_dismissed'
  | 'agent_invoked'
  | 'shortcut_pressed'
  | string;

export interface CopilotTelemetryEntry {
  userId: string;
  companyId: string | null;
  eventName: CopilotTelemetryEvent;
  agentId?: string;
  agentVersion?: string;
  module?: string;
  pathname?: string;
  cardId?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export async function recordTelemetry(
  supabase: SupabaseClient,
  entry: CopilotTelemetryEntry
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('copilot_telemetry').insert({
      user_id: entry.userId,
      company_id: entry.companyId,
      event_name: entry.eventName,
      agent_id: entry.agentId ?? null,
      agent_version: entry.agentVersion ?? null,
      module: entry.module ?? null,
      pathname: entry.pathname ?? null,
      card_id: entry.cardId ?? null,
      duration_ms: entry.durationMs ?? null,
      metadata: entry.metadata ?? null,
    });
    if (error) {
      // Telemetry must never break a user flow; just warn.
      console.warn('[copilot/telemetry] insert failed', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[copilot/telemetry] insert threw', message);
    return { ok: false, error: message };
  }
}
