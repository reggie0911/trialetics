'use client';

import dynamic from 'next/dynamic';

import type { StudyDetailTabsProps } from '@/components/ctms/studies/study-detail-tabs';

const StudyDetailTabsClientOnly = dynamic(
  () =>
    import('@/components/ctms/studies/study-detail-tabs').then((mod) => ({
      default: mod.StudyDetailTabs,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading study">
        <div className="flex justify-between gap-4">
          <div className="space-y-2">
            <div className="bg-muted h-4 w-24 rounded" />
            <div className="bg-muted h-8 w-64 max-w-full rounded" />
            <div className="bg-muted h-4 w-48 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="bg-muted h-9 w-20 rounded-md" />
            <div className="bg-muted h-9 w-28 rounded-md" />
          </div>
        </div>
        <div className="bg-muted h-10 w-full max-w-2xl rounded-md" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bg-muted h-64 rounded-lg" />
          <div className="bg-muted h-64 rounded-lg" />
        </div>
      </div>
    ),
  },
);

/**
 * Same as {@link StudyDetailTabs} but only rendered after mount. Avoids Radix Tabs + React 19
 * `useId` producing different `aria-controls` / `id` on the server vs client (hydration mismatch).
 */
export function StudyDetailTabsDynamic(props: StudyDetailTabsProps) {
  return <StudyDetailTabsClientOnly {...props} />;
}
