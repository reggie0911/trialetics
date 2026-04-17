import type { ToolDefinition } from './types';

/**
 * Tracker / non-CTMS write tools live here. CTMS write tools live in
 * `lib/ai/ctms-tools.ts` (`ctmsWriteTools`). Both registries are merged
 * into the orchestrator via `lib/ai/tool-registry.ts`.
 *
 * Every write tool *must* call `assertToolAllowedForRole(ctx.userRole, name)`
 * inside its handler. The orchestrator pre-filters by role too, but the
 * handler-level check is the GxP-grade enforcement point — it survives
 * orchestrator bypass (direct invocation, future tool APIs).
 */
export const writeToolDefinitions: Record<string, ToolDefinition> = {
  // Placeholder - no tracker write tools yet for the minimal CTMS reset
};
