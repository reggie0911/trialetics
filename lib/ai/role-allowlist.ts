/**
 * Role → tool allowlist lives on `ctms-tools.ts` next to `ctmsWriteTools` so we
 * never import `ctms-tools` from here at module load (that cycle caused TDZ
 * errors during Next.js page data collection).
 */
export type { CopilotRole } from './ctms-tools';
export { getWriteTools, isToolAllowedForRole, assertToolAllowedForRole } from './ctms-tools';
