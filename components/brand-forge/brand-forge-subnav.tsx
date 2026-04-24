'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { brandForgePath, brandForgeStudyIdFromPathname } from '@/lib/nav/brand-forge-paths';
import { cn } from '@/lib/utils';

/** First segment after /brand-forge/ that is not a study project UUID (e.g. `new`). */
const RESERVED_BRANDFORGE_SEGMENTS = new Set(['new']);

const SUBNAV_TOOLTIPS: Record<string, string> = {
  Studies: 'All BrandForge study brand projects for your workspace.',
  Overview: 'Study summary, editable brief, workspace status, and brand direction.',
  Logos: 'Generate logo concepts and refine them before your brand kit.',
  Colors: 'Define palette roles, contrast, and save your study color system.',
  Typography: 'Choose and save type pairings for study materials.',
  Imagery: 'Guidance and assets for photography and illustration style.',
  Mockups: 'Generate branded mockups for study materials like decks, flyers, binders, and more.',
  Recruitment: 'Recruitment campaign visuals and messaging helpers.',
  Templates: 'Slide decks, documents, and reusable layout themes.',
  Exports: 'Download logo packs, guides, and share read-only links.',
  'User Manual': 'Full BrandForge documentation and how-to guidance.',
};

export function BrandForgeSubnav() {
  const pathname = usePathname();
  const studyId = brandForgeStudyIdFromPathname(pathname);
  const basePath = brandForgePath(studyId);

  const projectIdMatch = pathname.match(/\/brand-forge\/([^/]+)/);
  const projectId = projectIdMatch?.[1];
  const isProjectRoute =
    projectId != null && !RESERVED_BRANDFORGE_SEGMENTS.has(projectId);

  const links = [
    { href: basePath, label: 'Studies', exact: true },
    ...(isProjectRoute
      ? [
          { href: brandForgePath(studyId, projectId ?? ''), label: 'Overview', exact: true },
          { href: brandForgePath(studyId, projectId ?? '', 'logos'), label: 'Logos', exact: false },
          { href: brandForgePath(studyId, projectId ?? '', 'colors'), label: 'Colors', exact: false },
          { href: brandForgePath(studyId, projectId ?? '', 'typography'), label: 'Typography', exact: false },
          { href: brandForgePath(studyId, projectId ?? '', 'imagery'), label: 'Imagery', exact: false },
          { href: brandForgePath(studyId, projectId ?? '', 'mockups'), label: 'Mockups', exact: false },
          { href: brandForgePath(studyId, projectId ?? '', 'recruitment'), label: 'Recruitment', exact: false },
          { href: brandForgePath(studyId, projectId ?? '', 'templates'), label: 'Templates', exact: false },
          { href: brandForgePath(studyId, projectId ?? '', 'exports'), label: 'Exports', exact: false },
        ]
      : []),
    { href: '/protected/docs/brand-forge', label: 'User Manual', exact: false },
  ];

  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
      {links.map((l) => {
        const active = l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Tooltip key={l.href}>
            <TooltipTrigger
              render={
                <Link
                  href={l.href}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-md border transition-colors',
                    active
                      ? 'border-border bg-primary/10 text-primary font-medium'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                />
              }
            >
              {l.label}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[260px] text-[11px] leading-snug">
              {SUBNAV_TOOLTIPS[l.label] ?? `Go to ${l.label}.`}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
