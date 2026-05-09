import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type SearchParams = { next?: string | string[] };

function pickNext(raw: string | string[] | undefined): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || !v.startsWith('/')) return '/protected';
  if (v.startsWith('//')) return '/protected';
  return v;
}

export default async function SubscriptionRequiredPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const next = pickNext(sp.next);

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Complete your subscription</CardTitle>
          <CardDescription>
            Your account is active, but this workspace needs an active Trialetics plan before you can
            use the product. Choose a plan and finish checkout in Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button render={<Link href="/pricing" />}>View plans &amp; subscribe</Button>
          <Button variant="outline" render={<Link href="/protected/settings/billing" />}>
            Open billing
          </Button>
          <Button variant="ghost" size="sm" render={<Link href={next} />}>
            Try again after subscribing
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
