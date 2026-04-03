'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/server';
import { ONBOARDING_TOUR_VERSION } from '@/lib/onboarding/constants';
import { parseOnboardingState, type OnboardingFlow, type OnboardingRoleState } from '@/lib/onboarding/types';
import type { Json } from '@/lib/types/database.types';

function mergeFlowState(
  raw: Json | null | undefined,
  flow: OnboardingFlow,
  patch: Partial<OnboardingRoleState>
): Json {
  const base = parseOnboardingState(raw);
  const prev = base[flow] ?? {};
  const out = {
    ...base,
    [flow]: { ...prev, ...patch },
  };
  return JSON.parse(JSON.stringify(out)) as Json;
}

function assertFlowMatchesRole(flow: OnboardingFlow, appRole: string): boolean {
  const expected: OnboardingFlow = appRole === 'admin' ? 'admin' : 'user';
  return flow === expected;
}

export async function patchOnboardingFlow(
  flow: OnboardingFlow,
  patch: Partial<OnboardingRoleState>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: 'Not signed in' };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('onboarding_state, role')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) return { ok: false, error: 'Profile not found' };
  if (!assertFlowMatchesRole(flow, profile.role)) {
    return { ok: false, error: 'Invalid guided tour for your role' };
  }

  const next = mergeFlowState(profile.onboarding_state as Json, flow, {
    ...patch,
    version: patch.version ?? ONBOARDING_TOUR_VERSION,
  });

  const { error: upErr } = await supabase.from('profiles').update({ onboarding_state: next }).eq('user_id', user.id);

  if (upErr) return { ok: false, error: upErr.message };
  revalidatePath('/protected', 'layout');
  return { ok: true };
}

export async function completeOnboardingFlow(flow: OnboardingFlow): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: 'Not signed in' };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('onboarding_state, role')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) return { ok: false, error: 'Profile not found' };
  if (!assertFlowMatchesRole(flow, profile.role)) {
    return { ok: false, error: 'Invalid guided tour for your role' };
  }

  const completedAt = new Date().toISOString();
  const next = mergeFlowState(profile.onboarding_state as Json, flow, {
    completedAt,
    currentStepId: 'complete',
    version: ONBOARDING_TOUR_VERSION,
  });

  const updates: Record<string, unknown> = { onboarding_state: next };

  if (flow === 'admin') {
    updates.onboarding_completed_at = completedAt;
  }

  const { error: upErr } = await supabase.from('profiles').update(updates).eq('user_id', user.id);

  if (upErr) return { ok: false, error: upErr.message };
  revalidatePath('/protected', 'layout');
  return { ok: true };
}

export async function setSkipAllOnboarding(flow: OnboardingFlow, skipAll: boolean): Promise<{ ok: boolean; error?: string }> {
  return patchOnboardingFlow(flow, {
    skipAll,
    version: ONBOARDING_TOUR_VERSION,
    ...(skipAll ? { currentStepId: null } : {}),
  });
}

export async function resetOnboardingFlow(flow: OnboardingFlow): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: 'Not signed in' };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('onboarding_state, role')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) return { ok: false, error: 'Profile not found' };
  if (!assertFlowMatchesRole(flow, profile.role)) {
    return { ok: false, error: 'Invalid guided tour for your role' };
  }

  const base = parseOnboardingState(profile.onboarding_state as Json);
  const next = {
    ...base,
    [flow]: {
      version: ONBOARDING_TOUR_VERSION,
      currentStepId: null,
      completedAt: null,
      dismissedAt: null,
      skipAll: false,
    },
  } as unknown as Json;

  const updates: Record<string, unknown> = { onboarding_state: next };
  if (flow === 'admin') {
    updates.onboarding_completed_at = null;
  }

  const { error: upErr } = await supabase.from('profiles').update(updates).eq('user_id', user.id);

  if (upErr) return { ok: false, error: upErr.message };
  revalidatePath('/protected', 'layout');
  return { ok: true };
}

export async function syncOnboardingTourVersion(flow: OnboardingFlow): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('onboarding_state, role')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) return { ok: false };
  if (!assertFlowMatchesRole(flow, profile.role)) return { ok: false };

  const base = parseOnboardingState(profile.onboarding_state as Json);
  const roleState = base[flow];
  if (!roleState || roleState.version === ONBOARDING_TOUR_VERSION || roleState.skipAll) {
    return { ok: true };
  }

  const next = mergeFlowState(profile.onboarding_state as Json, flow, {
    version: ONBOARDING_TOUR_VERSION,
    currentStepId: null,
  });

  const { error: upErr } = await supabase.from('profiles').update({ onboarding_state: next }).eq('user_id', user.id);
  if (upErr) return { ok: false };
  revalidatePath('/protected', 'layout');
  return { ok: true };
}
