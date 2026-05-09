'use client';

import { Button } from '@/components/ui/button';

export function PricingCta() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 text-inherit">
      <Button
        size="lg"
        variant="secondary"
        render={<a href="/pricing?intent=signup" />}
      >
        Get started
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="!bg-transparent text-inherit shadow-none border-2 border-current/45 hover:!bg-current/10 hover:!text-inherit dark:!bg-transparent dark:hover:!bg-current/10 dark:hover:!text-inherit"
        render={<a href="https://www.trialetics.io/contact" />}
      >
        Talk to sales
      </Button>
    </div>
  );
}
