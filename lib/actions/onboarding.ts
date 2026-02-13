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
