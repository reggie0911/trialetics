'use client';

import Link from 'next/link';
import { useState } from 'react';

import Logo from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { joinViaLink } from '@/lib/actions/team';
import { cn } from '@/lib/utils';

interface JoinViaLinkFormProps {
  token: string;
  companyName: string;
}

export function JoinViaLinkForm({ token, companyName }: JoinViaLinkFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const { error: err } = await joinViaLink(
        token,
        email,
        password,
        firstName,
        lastName || undefined
      );
      if (err) throw new Error(err);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
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
        <div className="mt-8 text-center text-sm">
          <Link href="/auth/login" className="font-medium hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col py-20 lg:py-0')}>
      <div className="flex flex-col items-center gap-6 text-center">
        <Logo onlyLogo={true} />
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold">Join {companyName}</h1>
          <p className="text-muted-foreground text-sm">
            Create your account to get started
          </p>
        </div>
      </div>
      <div className="mt-6 grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="first-name">First name</Label>
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
          <Label htmlFor="last-name">Last name (optional)</Label>
          <Input
            id="last-name"
            type="text"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
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
            <Checkbox id="terms" required />
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
  );
}
