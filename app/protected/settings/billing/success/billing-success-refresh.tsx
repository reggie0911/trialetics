'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

const MAX_RETRIES = 10;
const INTERVAL_MS = 3000;

export function BillingSuccessRefresh() {
  const router = useRouter();
  const retries = useRef(0);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (timedOut) return;

    const interval = setInterval(() => {
      retries.current += 1;
      if (retries.current >= MAX_RETRIES) {
        clearInterval(interval);
        setTimedOut(true);
        return;
      }
      router.refresh();
    }, INTERVAL_MS);

    return () => clearInterval(interval);
  }, [router, timedOut]);

  if (timedOut) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 text-center">
        <AlertCircle className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Your payment is still processing. This can take a minute.
        </p>
        <Link
          href="/protected/settings/billing"
          className="text-sm font-medium text-primary hover:underline"
        >
          Check billing settings
        </Link>
      </div>
    );
  }

  return null;
}
