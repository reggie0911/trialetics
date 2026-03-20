import Link from 'next/link';

import Logo from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { validateJoinToken } from '@/lib/actions/team';
import { cn } from '@/lib/utils';

import { JoinViaLinkForm } from './join-via-link-form';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function JoinPage({ params }: PageProps) {
  const { token } = await params;
  const validation = await validateJoinToken(token);

  if (!validation.valid) {
    return (
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="container w-full max-w-sm self-center justify-self-center">
          <div className={cn('flex flex-col py-20 lg:py-0')}>
            <div className="flex flex-col items-center gap-6 text-center">
              <Logo onlyLogo={true} />
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="text-xl">Invalid or Expired Link</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{validation.error}</p>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Please ask your administrator for a new invite link.
                  </p>
                  <Button variant="outline" className="mt-4 w-full" render={<Link href="/auth/login" />} nativeButton={false}>
                    Back to sign in
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        <div className="relative hidden bg-[url(/images/gradient.webp)] bg-cover bg-center bg-no-repeat lg:block dark:bg-[url(/images/gradient-dark.webp)]" />
      </div>
    );
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="container w-full max-w-sm self-center justify-self-center">
        <JoinViaLinkForm
          token={token}
          companyName={validation.companyName ?? 'this organization'}
        />
      </div>
      <div className="relative hidden bg-[url(/images/gradient.webp)] bg-cover bg-center bg-no-repeat lg:block dark:bg-[url(/images/gradient-dark.webp)]" />
    </div>
  );
}
