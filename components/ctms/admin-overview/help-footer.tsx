'use client';

import { ExternalLink, HelpCircle, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const SUPPORT_EMAIL = 'contact@trialetics.io';
const HELP_CENTER_URL = 'https://help.trialetics.io';

export function HelpFooter() {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400"
          >
            <HelpCircle className="h-[18px] w-[18px]" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">Need help with setup?</div>
            <p className="text-xs text-muted-foreground">
              Browse the help center or reach our support team for hands-on assistance.
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Button
            variant="outline"
            size="sm"
            render={
              <a
                href={HELP_CENTER_URL}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Open help center in a new tab"
              />
            }
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Help Center
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<a href={`mailto:${SUPPORT_EMAIL}`} aria-label="Email Trialetics support" />}
          >
            <Mail className="h-3.5 w-3.5" />
            Contact Support
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
