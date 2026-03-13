import type { ToolDefinition, UserContext } from './types';
import { writeToolDefinitions } from './write-tools';

function requireCompany(ctx: UserContext): string {
  if (!ctx.companyId) throw new Error('No company context available');
  return ctx.companyId;
}

export const toolDefinitions: Record<string, ToolDefinition> = {
  getSDVReports: {
    name: 'getSDVReports',
    description: 'List source data verification reports for the current company.',
    parameters: { type: 'object', properties: {} },
    handler: async (_args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getSDVReports } = await import('@/lib/actions/sdv-tracker');
      return getSDVReports(companyId);
    },
  },
};

const allTools = { ...toolDefinitions, ...writeToolDefinitions };

export function getToolDefinition(name: string): ToolDefinition | null {
  return allTools[name] ?? null;
}

export function getToolsForAgent(toolNames: string[]): ToolDefinition[] {
  return toolNames
    .map((name) => allTools[name])
    .filter((t): t is ToolDefinition => t != null);
}
