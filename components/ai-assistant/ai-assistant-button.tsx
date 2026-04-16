'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOnboardingChrome } from '@/components/onboarding/onboarding-chrome-context';
import { AIAssistantPanel } from './ai-assistant-panel';

const TRACKER_ROUTES = [
  '/protected/patients',
  '/protected/ae',
  '/protected/ecrf-query-tracker',
  '/protected/sdv-tracker',
  '/protected/vw',
  '/protected/mc',
];

export function AIAssistantButton() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  if (TRACKER_ROUTES.some(route => pathname.startsWith(route))) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform duration-200"
        size="icon"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
      <AIAssistantPanel open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}

export function AIAssistantInlineButton() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { suppressAiAssistant } = useOnboardingChrome();

  if (TRACKER_ROUTES.some(route => pathname.startsWith(route))) {
    return null;
  }

  if (suppressAiAssistant) {
    return null;
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              onClick={() => setIsOpen(true)}
              variant="ghost"
              size="icon"
              className="h-9 w-9"
            />
          }
        >
          <Sparkles className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          Open the assistant for help with navigation and tasks in this workspace.
        </TooltipContent>
      </Tooltip>
      <AIAssistantPanel open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
