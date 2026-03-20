import { Suspense } from 'react';
import { LoginForm } from './login-form';

function isValidRedirect(path: string | string[] | null | undefined): path is string {
  const val = Array.isArray(path) ? path[0] : path;
  return typeof val === 'string' && val.startsWith('/') && !val.startsWith('//');
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const resolved = await searchParams;
  const nextRaw = resolved?.next;
  const next = isValidRedirect(nextRaw) ? (Array.isArray(nextRaw) ? nextRaw[0] : nextRaw) : null;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <LoginForm next={next} />
    </Suspense>
  );
}
