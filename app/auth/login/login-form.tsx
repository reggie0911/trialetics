'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import Logo from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/client';
import { cn } from '@/lib/utils';

interface LoginFormProps {
  next: string | null;
}

export function LoginForm({ next }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const reasonMessage = useMemo(() => {
    const r = searchParams.get('reason');
    if (r === 'profile') {
      return 'Your account is missing a workspace profile. Try signing in again, or contact support if this continues.';
    }
    return null;
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailTrimmed,
        password,
      });
      if (error) throw error;
      // Full navigation so the proxy sees auth cookies on the next request (avoids RSC race with router.push).
      const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/protected';
      window.location.assign(target);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      if (message.includes('Invalid login credentials') || message.includes('invalid_credentials')) {
        setError('Invalid email or password. If you just signed up, please check your email to confirm your account first.');
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="container w-full max-w-sm self-center justify-self-center">
        <form onSubmit={handleLogin} className={cn('flex flex-col py-20 lg:py-0')}>
          <div className="flex flex-col items-center gap-6 text-center">
            <Logo onlyLogo={true} />
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-2xl font-bold">Welcome back</h1>
              <p className="text-muted-foreground text-sm">
                Welcome back, please enter your details
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Checkbox id="remember-me" />
                <Label htmlFor="remember-me">Remember me</Label>
              </div>
              <Link
                href="/auth/forgot-password"
                className="text-sm font-medium hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            {reasonMessage && !error && (
              <p className="text-sm text-amber-600 dark:text-amber-500 text-center">{reasonMessage}</p>
            )}
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
            <Button type="submit" className="mt-2 w-full shadow-none" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>

          </div>
          <div className="mt-8 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/auth/sign-up" className="font-medium hover:underline">
              Sign up
            </Link>
          </div>
        </form>
      </div>
      <div className="relative hidden bg-[url(/images/gradient.webp)] bg-cover bg-center bg-no-repeat lg:block dark:bg-[url(/images/gradient-dark.webp)]" />
    </div>
  );
}
