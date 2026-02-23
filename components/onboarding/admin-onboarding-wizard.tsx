'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingStepCompany } from './onboarding-step-company';
import { OnboardingStepProject } from './onboarding-step-project';
import { OnboardingStepInvite } from './onboarding-step-invite';
import { OnboardingStepPersonalInfo } from './onboarding-step-personal-info';
import { completeOnboarding, skipOnboarding } from '@/lib/actions/onboarding';
import { getActiveModules, type ModuleWithUserCount } from '@/lib/actions/admin';
import { useToast } from '@/hooks/use-toast';

const STEPS = [
  { id: 1, title: 'Company Setup' },
  { id: 2, title: 'First Project' },
  { id: 3, title: 'Invite Team' },
  { id: 4, title: 'Personal Information' },
];

interface InitialProject {
  protocolName: string;
  protocolNumber: string;
  trialPhase: string;
  protocolStatus: string;
}

interface AdminOnboardingWizardProps {
  companyId: string;
  profileId: string;
  companyName?: string | null;
  companyLogoUrl?: string | null;
  userEmail: string;
  initialProject?: InitialProject | null;
}

export function AdminOnboardingWizard({
  companyId,
  profileId,
  companyName,
  companyLogoUrl,
  userEmail,
  initialProject,
}: AdminOnboardingWizardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [modules, setModules] = useState<ModuleWithUserCount[]>([]);
  const [modulesLoaded, setModulesLoaded] = useState(false);

  // Load modules when we reach step 3 or 4
  useEffect(() => {
    if (!modulesLoaded && step >= 3) {
      getActiveModules(companyId).then((result) => {
        if (result.success && result.data) {
          setModules(result.data);
        }
        setModulesLoaded(true);
      });
    }
  }, [step, companyId, modulesLoaded]);

  const handleComplete = async () => {
    const result = await completeOnboarding(profileId);
    if (result.success) {
      toast({ title: 'Setup complete', description: 'Welcome to Trialetics!' });
      router.push('/protected');
      router.refresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleSkipAll = async () => {
    const result = await skipOnboarding(profileId);
    if (result.success) {
      toast({ title: 'Skipped', description: 'You can complete setup later from your profile.' });
      router.push('/protected');
      router.refresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <button
              type="button"
              onClick={() => setStep(s.id)}
              title={`Go to step ${s.id}: ${s.title}`}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-medium transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer ${
                step >= s.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {s.id}
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground pointer-events-none" />
            )}
          </div>
        ))}
      </div>
      <p className="text-[12px] text-muted-foreground">
        Step {step} of {STEPS.length}: {STEPS[step - 1].title}
      </p>

      {/* Step content */}
      {step === 1 && (
        <OnboardingStepCompany
          companyId={companyId}
          profileId={profileId}
          initialName={companyName ?? ''}
          initialLogoUrl={companyLogoUrl}
          onSaved={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <OnboardingStepProject
          initialProject={initialProject}
          onCreated={() => setStep(3)}
          onSkip={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <OnboardingStepInvite
          companyId={companyId}
          profileId={profileId}
          modules={modules}
          onInvited={() => setStep(4)}
          onSkip={() => setStep(4)}
        />
      )}

      {step === 4 && (
        <OnboardingStepPersonalInfo onComplete={handleComplete} />
      )}

      {/* Skip and go to study setup - hidden on step 1 */}
      {step !== 1 && (
        <div className="flex justify-center pt-4">
          <Button variant="ghost" size="sm" onClick={handleSkipAll} className="text-[12px]">
            Skip and Go to Study Setup
          </Button>
        </div>
      )}
    </div>
  );
}
