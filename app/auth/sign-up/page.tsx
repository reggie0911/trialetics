'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import Logo from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/client';

const COMPANY_NAME_MAX_LEN = 200;

export default function SignUpPage() {
  const [firstName, setFirstName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (!termsAccepted) {
      setError('Please accept the Terms and Conditions to continue.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    const firstTrimmed = firstName.trim();
    if (!firstTrimmed) {
      setError('Please enter your first name.');
      setIsLoading(false);
      return;
    }

    const companyTrimmed = companyName.trim();
    if (!companyTrimmed) {
      setError('Please enter your company or organization name.');
      setIsLoading(false);
      return;
    }

    if (companyTrimmed.length > COMPANY_NAME_MAX_LEN) {
      setError(`Company name must be at most ${COMPANY_NAME_MAX_LEN} characters.`);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailTrimmed,
        password,
        options: {
          data: {
            first_name: firstTrimmed,
            company_name: companyTrimmed,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/protected`,
        },
      });
      if (error) throw error;

      // Email confirmation off: session is returned immediately; go straight in.
      if (data.session) {
        router.refresh();
        router.push('/protected');
        return;
      }

      router.push('/auth/sign-up-success');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      if (message.includes('already registered') || message.includes('User already registered')) {
        setError('An account with this email already exists. Try signing in or use a different email.');
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="container w-full max-w-sm">
        <form onSubmit={handleSignUp} className="flex flex-col py-12">
          <div className="flex flex-col items-center gap-6 text-center">
            <Logo onlyLogo={true} />
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-2xl font-bold">Create your account</h1>
              <p className="text-muted-foreground text-sm">
                Join us today and get started in just a few steps
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="first-name">
                First name{' '}
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="first-name"
                type="text"
                placeholder="Jane"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="company-name">
                Company name{' '}
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="company-name"
                type="text"
                placeholder="Your organization"
                required
                autoComplete="organization"
                maxLength={COMPANY_NAME_MAX_LEN}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">
                Email{' '}
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </Label>
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
            <div className="grid gap-1.5">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(v) => setTermsAccepted(v === true)}
                />
                <Label htmlFor="terms" className="">
                  I agree to the{' '}
                </Label>
              </div>
              <Link
                href="/terms-and-conditions"
                className="text-end text-sm font-medium hover:underline"
              >
                Terms and Conditions
              </Link>{' '}
            </div>
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
            <div>
              <Button type="submit" className="mt-2 w-full shadow-none" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </div>
          </div>
          <div className="mt-8 text-center text-sm">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </div>
      <div className="relative hidden bg-[url(/images/gradient.webp)] bg-cover bg-center bg-no-repeat lg:block dark:bg-[url(/images/gradient-dark.webp)]" />
    </div>
  );
}
