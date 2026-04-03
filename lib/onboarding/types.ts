import type { Json } from '@/lib/types/database.types';

export type OnboardingFlow = 'admin' | 'user';

export type OnboardingRoleState = {
  version?: number;
  /** Current step id; null/undefined before welcome is acknowledged. */
  currentStepId?: string | null;
  completedAt?: string | null;
  dismissedAt?: string | null;
  skipAll?: boolean;
};

export type OnboardingStatePayload = {
  admin?: OnboardingRoleState;
  user?: OnboardingRoleState;
};

export type OnboardingStepKind = 'welcome' | 'coach' | 'complete';

export type OnboardingStepDef = {
  id: string;
  title: string;
  body: string;
  kind: OnboardingStepKind;
  /** For coach steps: stay on routes starting with this path. */
  routePrefix?: string;
  /** When set, pathname must equal this (dashboard only) instead of prefix matching. */
  routeExact?: string;
  /**
   * Query string without leading `?` (e.g. `tab=admin`).
   * Used when navigating to this step so the correct sub-view opens (see Trip Reports tabs).
   */
  routeSearch?: string;
  /** `data-onboarding` value; omit for dialog-only steps on any route. */
  anchor?: string;
  nextId: string | null;
  /** When true, step is omitted if the tenant does not have CTMS. */
  requiresCtms?: boolean;
};

export function parseOnboardingState(raw: Json | null | undefined): OnboardingStatePayload {
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const parseRole = (v: unknown): OnboardingRoleState | undefined => {
    if (v === null || v === undefined || typeof v !== 'object' || Array.isArray(v)) return undefined;
    const r = v as Record<string, unknown>;
    return {
      version: typeof r.version === 'number' ? r.version : undefined,
      currentStepId: typeof r.currentStepId === 'string' ? r.currentStepId : r.currentStepId === null ? null : undefined,
      completedAt: typeof r.completedAt === 'string' ? r.completedAt : undefined,
      dismissedAt: typeof r.dismissedAt === 'string' ? r.dismissedAt : undefined,
      skipAll: typeof r.skipAll === 'boolean' ? r.skipAll : undefined,
    };
  };
  return {
    admin: parseRole(o.admin),
    user: parseRole(o.user),
  };
}
