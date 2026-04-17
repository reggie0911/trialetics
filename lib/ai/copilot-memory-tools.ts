import 'server-only';

import type { ToolDefinition, UserContext } from './types';
import { getMemory, setMemory, deleteMemory } from '@/lib/copilot/memory';
import { createClient } from '@/lib/server';

/**
 * Tools the `memory-keeper` agent uses to read/write the per-user Copilot
 * memory store. The store is personal preference data, not company data, so
 * these are NOT registered in `WRITE_TOOLS` — every authenticated role can
 * curate their own memory regardless of role.
 *
 * For `setCopilotMemory`/`deleteCopilotMemory` the underlying helpers in
 * `lib/copilot/memory.ts` already record an audit entry, so callers don't
 * need to.
 */

function requireUser(ctx: UserContext): { userId: string; companyId: string } {
  if (!ctx.userId) throw new Error('No user context available for memory operation');
  if (!ctx.companyId) throw new Error('No company context available for memory operation');
  return { userId: ctx.userId, companyId: ctx.companyId };
}

export const copilotMemoryToolDefinitions: Record<string, ToolDefinition> = {
  getCopilotMemory: {
    name: 'getCopilotMemory',
    description:
      'Retrieve memory entries the user has previously stored, optionally filtered by scope or key. Use to recall preferences before answering.',
    parameters: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          description: 'Optional scope filter. Examples: "global", "study:<uuid>", "site:<uuid>".',
        },
        key: { type: 'string', description: 'Optional exact key to fetch.' },
      },
    },
    handler: async (args, ctx) => {
      const { userId } = requireUser(ctx);
      const supabase = await createClient();
      const entries = await getMemory(supabase, {
        userId,
        scope: args.scope as string | undefined,
        key: args.key as string | undefined,
      });
      return { entries };
    },
  },

  setCopilotMemory: {
    name: 'setCopilotMemory',
    description:
      'Store a memory entry for the user. Upserts on (scope, key). Use sparingly: only persist things the user explicitly confirmed or asked you to remember.',
    parameters: {
      type: 'object',
      properties: {
        scope: { type: 'string', description: 'Defaults to "global". See getCopilotMemory.' },
        key: { type: 'string', description: 'Memory key. Use snake_case ids.' },
        value: { description: 'JSON-serializable value to remember.' },
        reason: { type: 'string', description: 'Why this is being remembered (audit-friendly).' },
      },
      required: ['key', 'value'],
    },
    handler: async (args, ctx) => {
      const { userId, companyId } = requireUser(ctx);
      const supabase = await createClient();
      const result = await setMemory(supabase, {
        userId,
        companyId,
        scope: args.scope as string | undefined,
        key: args.key as string,
        value: args.value,
        source: 'agent',
        agentId: 'memory-keeper',
        agentVersion: '1.0.0',
        reason: args.reason as string | undefined,
      });
      return result;
    },
  },

  deleteCopilotMemory: {
    name: 'deleteCopilotMemory',
    description: 'Delete a memory entry by id. The user must have explicitly asked to forget it.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Memory entry id (uuid).' },
        reason: { type: 'string' },
      },
      required: ['id'],
    },
    handler: async (args, ctx) => {
      const { userId, companyId } = requireUser(ctx);
      const supabase = await createClient();
      return deleteMemory(supabase, {
        userId,
        companyId,
        id: args.id as string,
        reason: args.reason as string | undefined,
        agentId: 'memory-keeper',
        agentVersion: '1.0.0',
      });
    },
  },
};
