import Link from 'next/link';

import { buildFinanceModulePath } from '@/lib/finance-module/types';

export function FinanceWorkspaceBanner({ studyId }: { studyId: string }) {
  return (
    <div
      role="status"
      className="border-b border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-center text-[13px] leading-snug text-amber-950 dark:text-amber-50"
    >
      Finance workspace is not initialized for this study.{' '}
      <Link href={buildFinanceModulePath(studyId, null)} className="font-medium underline underline-offset-2">
        Open the dashboard
      </Link>{' '}
      or{' '}
      <Link href={buildFinanceModulePath(studyId, 'settings')} className="font-medium underline underline-offset-2">
        Finance settings
      </Link>{' '}
      to set it up.
    </div>
  );
}
