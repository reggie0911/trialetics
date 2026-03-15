import type { ToolDefinition, UserContext } from './types';
import { writeToolDefinitions } from './write-tools';
import { ctmsReadTools, ctmsWriteTools } from './ctms-tools';

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

  generateCSVExport: {
    name: 'generateCSVExport',
    description: 'Generate a CSV export of the provided data. Returns a download link.',
    parameters: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Filename for the export (without extension)' },
        data: { type: 'array', description: 'Array of objects to export as CSV rows' },
      },
      required: ['filename', 'data'],
    },
    handler: async (args) => {
      const rows = args.data as Record<string, unknown>[];
      if (!rows || rows.length === 0) return { error: 'No data to export' };
      const headers = Object.keys(rows[0]);
      const csvLines = [
        headers.join(','),
        ...rows.map((row) => headers.map((h) => {
          const val = String(row[h] ?? '');
          return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(',')),
      ];
      return {
        csv: csvLines.join('\n'),
        filename: `${args.filename}.csv`,
        rowCount: rows.length,
      };
    },
  },
};

const allTools = { ...toolDefinitions, ...writeToolDefinitions, ...ctmsReadTools, ...ctmsWriteTools };

export function getToolDefinition(name: string): ToolDefinition | null {
  return allTools[name] ?? null;
}

export function getToolsForAgent(toolNames: string[]): ToolDefinition[] {
  return toolNames
    .map((name) => allTools[name])
    .filter((t): t is ToolDefinition => t != null);
}
