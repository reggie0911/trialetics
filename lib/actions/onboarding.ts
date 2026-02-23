'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface OnboardingStatus {
  completed: boolean;
  completedAt?: string;
}

/**
 * Get onboarding status for a profile
 */
export async function getOnboardingStatus(
  profileId: string
): Promise<ActionResponse<OnboardingStatus>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed_at')
      .eq('id', profileId)
      .single();

    if (error) {
      console.error('Error fetching onboarding status:', error);
      return { success: false, error: 'Failed to fetch onboarding status' };
    }

    return {
      success: true,
      data: {
        completed: !!data?.onboarding_completed_at,
        completedAt: data?.onboarding_completed_at ?? undefined,
      },
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching onboarding status' };
  }
}

/**
 * Mark onboarding as complete
 */
export async function completeOnboarding(
  profileId: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify the profile belongs to the current user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('id', profileId)
      .single();

    if (profileError || !profile || profile.user_id !== user.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', profileId);

    if (updateError) {
      console.error('Error completing onboarding:', updateError);
      return { success: false, error: 'Failed to complete onboarding' };
    }

    revalidatePath('/protected');
    revalidatePath('/protected/onboarding');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error completing onboarding' };
  }
}

/**
 * Skip onboarding (same as complete)
 */
export async function skipOnboarding(
  profileId: string
): Promise<ActionResponse<void>> {
  return completeOnboarding(profileId);
}

function mapPhaseToDisplay(phase: string | null): string {
  if (!phase) return 'Phase I';
  const map: Record<string, string> = {
    phase_i: 'Phase I',
    phase_ii: 'Phase II',
    phase_iii: 'Phase III',
    phase_iv: 'Phase IV',
    observational: 'Observational',
  };
  return map[phase] ?? phase;
}

function mapStatusToDisplay(status: string | null): string {
  if (!status) return 'planning';
  const map: Record<string, string> = {
    planned: 'planning',
    in_progress: 'approved',
    on_hold: 'planning',
    completed: 'closed',
    terminated: 'closed',
  };
  return map[status] ?? status;
}

export interface InitialProject {
  protocolName: string;
  protocolNumber: string;
  trialPhase: string;
  protocolStatus: string;
}

/**
 * Fetch the most recent project for the current user's company (for pre-populating First Project step)
 */
export async function getFirstProjectForOnboarding(): Promise<
  ActionResponse<InitialProject | null>
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return { success: false, error: 'No company found' };
    }

    const { data: firstProject, error } = await supabase
      .from('clinical_protocols')
      .select('title, protocol_number, phase, status')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching first project:', error);
      return { success: false, error: 'Failed to fetch project' };
    }

    if (!firstProject) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        protocolName: firstProject.title ?? '',
        protocolNumber: firstProject.protocol_number ?? '',
        trialPhase: mapPhaseToDisplay(firstProject.phase),
        protocolStatus: mapStatusToDisplay(firstProject.status),
      },
    };
  } catch (err) {
    console.error('Unexpected error in getFirstProjectForOnboarding:', err);
    return { success: false, error: 'Failed to fetch project' };
  }
}
