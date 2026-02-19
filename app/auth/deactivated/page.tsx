'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import Logo from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/client';

export default function DeactivatedPage() {
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo onlyLogo={true} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Account Deactivated</CardTitle>
            <CardDescription>
              Your account has been deactivated by an administrator. You no longer have access to
              the application. If you believe this is an error, please contact your company
              administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button onClick={handleSignOut} className="w-full" variant="default">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/auth/login" className="underline hover:no-underline">
                Return to login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
