'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import * as React from 'react';

// next-themes injects a blocking inline <script> to avoid theme flash (FOUC). React 19+
// reports "Encountered a script tag while rendering..."; the script still runs on SSR
// and hydration as intended. See: https://github.com/pacocoursey/next-themes/issues/387
const g = globalThis as { __triaThemesConsolePatch?: true };
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && !g.__triaThemesConsolePatch) {
  g.__triaThemesConsolePatch = true;
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0] as string).includes('Encountered a script tag while rendering React component')
    ) {
      return;
    }
    orig.apply(console, args);
  };
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
