import { ADMIN_CTMS_STEPS, ADMIN_NO_CTMS_STEPS } from './admin-steps';
import { USER_CTMS_STEPS, USER_NO_CTMS_STEPS } from './user-steps';
import type { OnboardingFlow, OnboardingStepDef } from './types';

export function selectStepsForFlow(flow: OnboardingFlow, hasCtmsAccess: boolean): OnboardingStepDef[] {
  if (flow === 'admin') {
    return hasCtmsAccess ? ADMIN_CTMS_STEPS : ADMIN_NO_CTMS_STEPS;
  }
  return hasCtmsAccess ? USER_CTMS_STEPS : USER_NO_CTMS_STEPS;
}

export function getStepById(steps: OnboardingStepDef[], id: string | null | undefined): OnboardingStepDef | undefined {
  if (!id) return undefined;
  return steps.find((s) => s.id === id);
}
