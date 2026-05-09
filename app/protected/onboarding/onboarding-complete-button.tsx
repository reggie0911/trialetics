'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { completeCompanyOnboarding } from '@/lib/actions/onboarding';
import { Button } from '@/components/ui/button';

export function OnboardingCompleteButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          const res = await completeCompanyOnboarding();
          if (!res.ok) {
            setError(res.error);
            setPending(false);
            return;
          }
          router.push('/protected');
          router.refresh();
        }}
      >
        {pending ? 'Saving…' : 'Enter workspace'}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
