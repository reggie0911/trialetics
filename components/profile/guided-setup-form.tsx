'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Compass } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/client';
import { resetOnboardingFlow, setSkipAllOnboarding } from '@/lib/actions/onboarding';
import { ONBOARDING_SESSION_DISMISS_KEY, parseOnboardingState, type OnboardingFlow } from '@/lib/onboarding';
import type { Json } from '@/lib/types/database.types';

type GuidedSetupFormProps = {
  onUpdated?: () => void;
};

export function GuidedSetupForm({ onUpdated }: GuidedSetupFormProps) {
  const router = useRouter();
  const [flow, setFlow] = useState<OnboardingFlow | null>(null);
  const [skipAll, setSkipAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_state')
      .eq('user_id', user.id)
      .single();
    if (!profile) {
      setLoading(false);
      return;
    }
    const f: OnboardingFlow = profile.role === 'admin' ? 'admin' : 'user';
    setFlow(f);
    const st = parseOnboardingState(profile.onboarding_state as Json | null | undefined)[f];
    setSkipAll(st?.skipAll === true);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSkipToggle = async (checked: boolean) => {
    if (!flow) return;
    setPending(true);
    const res = await setSkipAllOnboarding(flow, checked);
    setPending(false);
    if (res.ok) {
      setSkipAll(checked);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(ONBOARDING_SESSION_DISMISS_KEY);
      }
      onUpdated?.();
      router.refresh();
    }
  };

  const handleReplay = async () => {
    if (!flow) return;
    setPending(true);
    const res = await resetOnboardingFlow(flow);
    setPending(false);
    if (res.ok) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(ONBOARDING_SESSION_DISMISS_KEY);
      }
      onUpdated?.();
      router.refresh();
    }
  };

  if (loading || !flow) {
    return <p className="text-xs text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border p-4">
        <Compass className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium">Tips for new users</p>
          <p className="text-xs text-muted-foreground">
            The short tour explains where to find studies, trip reports, tasks, and settings. Turning this off only affects your
            account; it does not change what your organization can do in the application.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="onboarding-skip-all" className="text-sm">
            Turn off guided tips
          </Label>
          <p className="text-xs text-muted-foreground">You will not see automatic prompts or the step-by-step tour.</p>
        </div>
        <Switch
          id="onboarding-skip-all"
          checked={skipAll}
          onCheckedChange={(v) => void handleSkipToggle(v)}
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Button type="button" variant="outline" size="sm" className="text-xs h-9" disabled={pending} onClick={() => void handleReplay()}>
          Restart guided tour
        </Button>
        <p className="text-xs text-muted-foreground">
          Clears your progress and offers the tour again the next time you open the main dashboard, unless you have turned tips off
          above.
        </p>
      </div>
    </div>
  );
}
