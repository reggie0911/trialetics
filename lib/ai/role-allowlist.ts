/**
 * Role -> tool allowlist. Belt and suspenders alongside any UI gating: every
 * write tool re-checks this in its own handler, and the orchestrator filters
 * the agent's tool list against it before exposing tools to the model.
 *
 * The default posture is permissive for read tools and restrictive for write
 * tools. New write tools should be opted in here explicitly — by default a
 * tool listed in `WRITE_TOOLS` is denied to roles not enumerated.
 *
 * Roles in use across the platform (per `lib/types/ctms.ts` + RBAC):
 *  - `platform_admin` — internal Trialetics; full access
 *  - `admin` — company admin; broad access
 *  - `manager` — study/site manager
 *  - `user` — default authenticated user
 *  - `viewer` — read-only
 */

import { ctmsWriteTools } from './ctms-tools';
import { writeToolDefinitions } from './write-tools';

export type CopilotRole = string;

/** Every tool name we know writes to Supabase or external systems. */
export const WRITE_TOOLS: ReadonlySet<string> = new Set([
  ...Object.keys(ctmsWriteTools),
  ...Object.keys(writeToolDefinitions),
]);

/**
 * Per-tool role allowlists. A missing entry means the tool is read-only and
 * available to every authenticated role except `viewer` for writes (handled
 * in `isToolAllowedForRole`).
 *
 * To restrict a write tool to specific roles, list them here.
 */
const TOOL_ROLE_ALLOWLIST: Record<string, ReadonlySet<CopilotRole>> = {
  recordKriValue: new Set(['platform_admin', 'admin', 'manager']),
  createMilestone: new Set(['platform_admin', 'admin', 'manager']),
  createTask: new Set(['platform_admin', 'admin', 'manager', 'user']),
  updateTripReportSummary: new Set(['platform_admin', 'admin', 'manager']),
};

/**
 * Returns true if the role is permitted to invoke the tool.
 *
 * Read tools: allowed for any role.
 * Write tools (anything in `WRITE_TOOLS`): denied for `viewer` always; for
 *   other roles, allowed if either the tool has no explicit allowlist or
 *   the role is in the allowlist; `platform_admin` is always allowed.
 */
export function isToolAllowedForRole(role: CopilotRole, toolName: string): boolean {
  if (role === 'platform_admin') return true;
  if (!WRITE_TOOLS.has(toolName)) return true;
  if (role === 'viewer') return false;
  const allow = TOOL_ROLE_ALLOWLIST[toolName];
  if (!allow) return true;
  return allow.has(role);
}

/**
 * Throw a descriptive error if the role can't run the tool. Use inside write
 * handlers as a defense-in-depth check (the orchestrator already pre-filters,
 * but anything that bypasses the orchestrator — direct invocation, future
 * tool-call APIs — still gets gated).
 */
export function assertToolAllowedForRole(role: CopilotRole, toolName: string): void {
  if (!isToolAllowedForRole(role, toolName)) {
    throw new Error(
      `Permission denied: role "${role}" cannot run tool "${toolName}". Contact your admin if you believe this is in error.`
    );
  }
}
