'use client';

import React from 'react';
import { Loader2, Puzzle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type ModuleWithUserCount } from '@/lib/actions/admin';

interface OnboardingStepModulesProps {
  modules: ModuleWithUserCount[];
  onComplete: () => void;
}

export function OnboardingStepModules({ modules, onComplete }: OnboardingStepModulesProps) {
  const [isCompleting, setIsCompleting] = React.useState(false);
  const activeModules = modules.filter((m) => m.active);

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await onComplete();
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Puzzle className="h-5 w-5" />
          Module Configuration
        </CardTitle>
        <CardDescription>
          Review the modules available to your organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {activeModules.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[12px] font-medium">Available Modules</p>
            <ul className="grid grid-cols-2 gap-2">
              {activeModules.map((mod) => (
                <li
                  key={mod.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-[12px]"
                >
                  <span>{mod.name}</span>
                  {mod.user_count > 0 && (
                    <span className="text-muted-foreground">{mod.user_count} user(s)</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">No modules configured yet.</p>
        )}

        <div className="flex flex-col gap-2">
          <Button onClick={handleComplete} disabled={isCompleting} className="text-[12px]">
            {isCompleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Completing...
              </>
            ) : (
              'Complete Setup'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
