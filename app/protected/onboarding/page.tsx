import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/server';
import { companyHasPaidSubscriptionAccess } from '@/lib/server/require-active-subscription';
import { PLAN_CONFIGS, normalizeSubscriptionPlan } from '@/lib/types/ctms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OnboardingCompleteButton } from './onboarding-complete-button';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.company_id) redirect('/auth/login?reason=profile');

  const { data: company } = await supabase
    .from('companies')
    .select('name, onboarding_completed_at')
    .eq('id', profile.company_id)
    .single();

  if (company?.onboarding_completed_at) {
    redirect('/protected');
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, cancel_at_period_end')
    .eq('company_id', profile.company_id)
    .maybeSingle();

  if (!companyHasPaidSubscriptionAccess(subscription)) {
    redirect('/subscription-required?next=%2Fprotected%2Fonboarding');
  }

  const plan = normalizeSubscriptionPlan(subscription?.plan);
  const planName = PLAN_CONFIGS[plan].name;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Trialetics</CardTitle>
          <CardDescription>
            Your <span className="font-medium text-foreground">{planName}</span> subscription is active.
            {company?.name ? (
              <>
                {' '}
                You&apos;re setting up <span className="font-medium text-foreground">{company.name}</span>.
              </>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          <ul className="list-inside list-disc space-y-2">
            <li>Invite teammates from Settings → Team when you&apos;re ready.</li>
            <li>Review billing and invoices anytime under Settings → Billing.</li>
            <li>Use the in-app assistant for help with your first workflows.</li>
          </ul>
          {profile.role === 'admin' ? (
            <OnboardingCompleteButton />
          ) : (
            <p className="text-xs">
              Ask a company admin to open this page once to finish organization setup, or{' '}
              <Link href="/protected" className="font-medium text-primary underline-offset-4 hover:underline">
                go to the dashboard
              </Link>
              .
            </p>
          )}
          <Button variant="outline" size="sm" render={<Link href="/protected/settings/billing" />}>
            Billing &amp; plan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
