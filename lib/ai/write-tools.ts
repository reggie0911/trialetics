import type { ToolDefinition, UserContext } from './types';

function requireCompany(ctx: UserContext): string {
  if (!ctx.companyId) throw new Error('No company context available');
  return ctx.companyId;
}

function requireWriteAccess(ctx: UserContext): void {
  if (ctx.userRole === 'viewer') {
    throw new Error('Insufficient permissions. Viewers cannot create or modify data.');
  }
}

export const writeToolDefinitions: Record<string, ToolDefinition> = {
  // Placeholder - no write tools for minimal CTMS reset
  // Add tracker-related write tools here as needed
};
