'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Logo from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/client';

function pickNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/')) return '/pricing';
  if (raw.startsWith('//')) return '/pricing';
  return raw;
}

function SignUpSuccessContent() {
  const searchParams = useSearchParams();
  const nextPath = pickNext(searchParams.get('next'));
  const [email, setEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setResendError('Please enter your email address');
      return;
    }
    setResendStatus('loading');
    setResendError(null);
    try {
      const supabase = createClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (error) throw error;
      setResendStatus('success');
    } catch (err) {
      setResendStatus('error');
      setResendError(err instanceof Error ? err.message : 'Failed to resend email');
    }
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="container w-full max-w-sm self-center justify-self-center">
        <div className={cn('flex flex-col py-20 lg:py-0')}>
          <div className="flex flex-col items-center gap-6 text-center">
            <Logo onlyLogo={true} />
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-2xl font-bold">Thank you for signing up!</h1>
              <p className="text-muted-foreground text-sm">
                Check your email to confirm your account
              </p>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              You&apos;ve successfully signed up. Please check your email to confirm your account
              before signing in.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Don&apos;t see the email? Check your spam folder.
            </p>
          </div>
          <div className="mt-6 grid gap-4">
            <form onSubmit={handleResend} className="flex flex-col gap-2">
              <input
                type="email"
                placeholder="Enter your email to resend"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
              <Button type="submit" variant="outline" size="sm" disabled={resendStatus === 'loading'}>
                {resendStatus === 'loading' ? 'Sending...' : 'Resend confirmation email'}
              </Button>
              {resendStatus === 'success' && (
                <p className="text-sm text-green-600">Email sent! Check your inbox.</p>
              )}
              {resendStatus === 'error' && resendError && (
                <p className="text-sm text-red-500">{resendError}</p>
              )}
            </form>
          </div>
          <div className="mt-8 text-center text-sm">
            <Link href="/auth/login" className="font-medium hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-[url(/images/gradient.webp)] bg-cover bg-center bg-no-repeat lg:block dark:bg-[url(/images/gradient-dark.webp)]" />
    </div>
  );
}

export default function SignUpSuccessClient() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-svh place-items-center text-sm text-muted-foreground">Loading…</div>
      }
    >
      <SignUpSuccessContent />
    </Suspense>
  );
}
