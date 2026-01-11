import Link from 'next/link';

import Logo from '@/components/layout/logo';
import { cn } from '@/lib/utils';

export default function SignUpSuccessPage() {
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
