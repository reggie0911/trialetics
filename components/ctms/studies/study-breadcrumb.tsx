'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useMemo } from 'react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { parseStudyIdFromPathname } from '@/lib/nav/ctms-study-paths';

import { useStudyBreadcrumbLeafLabel } from './study-breadcrumb-context';

interface StudyBreadcrumbProps {
  studyId: string;
  /** Display name for the study root crumb (study_name || title). */
  headingName: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SEGMENT_LABELS: Record<string, string> = {
  sites: 'Sites',
  subjects: 'Subjects',
  visits: 'Visits',
  team: 'Team',
  etmf: 'eTMF',
  eisf: 'eISF',
  directory: 'Directory',
  financials: 'Financials',
  'trip-reports': 'Trip reports',
  'inventory-management': 'Inventory',
  tasks: 'Tasks',
  'my-tasks': 'My tasks',
  countries: 'Countries',
  reports: 'Reports',
  'brand-forge': 'Brand Forge',
  'custom-trackers': 'Custom trackers',
  templates: 'Templates',
  author: 'Author',
  approvals: 'Approvals',
  library: 'Library',
  folders: 'Folders',
  documents: 'Documents',
  'expected-documents': 'Expected documents',
  'staff-expected-documents': 'Staff expected documents',
  'bulk-upload': 'Bulk upload',
  rules: 'Rules',
  requests: 'Requests',
  edit: 'Edit',
  new: 'New',
};

interface Crumb {
  key: string;
  label: string;
  /** When omitted, the crumb is rendered as `BreadcrumbPage` (current page). */
  href?: string;
}

function shortId(id: string): string {
  return `${id.slice(0, 8)}…`;
}

function labelForSegment(segment: string): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  if (UUID_RE.test(segment)) return shortId(segment);
  return segment;
}

/**
 * Renders the unified study-scoped breadcrumb that lives inside
 * `StudyCompactHeader`. Module segments (Sites, Subjects, etc.) come from a
 * static label map; the deepest crumb falls back to the human-readable label
 * registered via `useStudyBreadcrumbLeaf` from the active detail page.
 */
export function StudyBreadcrumb({
  studyId,
  headingName,
}: StudyBreadcrumbProps) {
  const pathname = usePathname() ?? '';
  const leafLabel = useStudyBreadcrumbLeafLabel();

  const crumbs = useMemo<Crumb[]>(() => {
    const studiesCrumb: Crumb = {
      key: 'studies',
      label: 'Studies',
      href: '/protected/studies/catalog',
    };
    const studyRoot = `/protected/studies/${studyId}`;
    const studyCrumb: Crumb = {
      key: 'study',
      label: headingName,
      href: studyRoot,
    };

    const parsedStudyId = parseStudyIdFromPathname(pathname);
    if (!parsedStudyId) return [studiesCrumb, studyCrumb];

    const after = pathname.slice(`/protected/studies/${parsedStudyId}`.length);
    const segments = after.split('/').filter(Boolean);
    if (segments.length === 0) {
      return [studiesCrumb, studyCrumb];
    }

    const tail: Crumb[] = [];
    let acc = studyRoot;
    segments.forEach((segment, idx) => {
      acc = `${acc}/${segment}`;
      const isLast = idx === segments.length - 1;
      const fallbackLabel = labelForSegment(segment);
      const isUuid = UUID_RE.test(segment);
      const label = isLast && isUuid && leafLabel ? leafLabel : fallbackLabel;
      tail.push({
        key: `${segment}-${idx}`,
        label,
        href: isLast ? undefined : acc,
      });
    });

    // Mark the study crumb as a link (we already drilled deeper).
    return [studiesCrumb, studyCrumb, ...tail];
  }, [pathname, studyId, headingName, leafLabel]);

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="text-sm">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <Fragment key={crumb.key}>
              <BreadcrumbItem className="min-w-0">
                {crumb.href && !isLast ? (
                  <BreadcrumbLink
                    render={<Link href={crumb.href} />}
                    className="inline-flex min-w-0 items-center gap-1.5 truncate"
                  >
                    <span className="truncate">{crumb.label}</span>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="inline-flex min-w-0 items-center gap-1.5 truncate font-semibold tracking-tight">
                    <span className="truncate">{crumb.label}</span>
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
