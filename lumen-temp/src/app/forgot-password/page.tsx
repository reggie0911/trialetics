'use client';

import Link from 'next/link';

import Logo from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function ForgotPasswordPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="container w-full max-w-sm self-center justify-self-center">
        <form className={cn('flex flex-col py-20 lg:py-0')}>
          <div className="flex flex-col items-center gap-6 text-center">
            <Logo onlyLogo={true} />
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-2xl font-bold">Forgot your password?</h1>
              <p className="text-muted-foreground text-sm">
                No worries, we&apos;ll send you reset instructions
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                required
              />
            </div>
            <Button type="submit" className="mt-2 w-full shadow-none">
              Reset Password
            </Button>
          </div>
          <div className="mt-8 text-center text-sm">
            Remember your password?{' '}
            <Link href="/signin" className="font-medium hover:underline">
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
      <div className="relative hidden bg-[url(/images/gradient.webp)] bg-cover bg-center bg-no-repeat lg:block dark:bg-[url(/images/gradient-dark.webp)]" />
    </div>
  );
}
