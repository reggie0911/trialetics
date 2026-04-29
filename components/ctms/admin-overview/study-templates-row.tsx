'use client';

import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatPlanDate } from '@/lib/utils/visit-window';
import type { StudyBudgetTemplate } from '@/lib/types/ctms';

interface StudyTemplatesRowProps {
  templates: StudyBudgetTemplate[];
  /** Where the View all + Create New tiles link to. */
  manageHref: string;
}

export function StudyTemplatesRow({ templates, manageHref }: StudyTemplatesRowProps) {
  const visible = templates.slice(0, 3);

  return (
    <Card id="study-templates" className="scroll-mt-20">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b">
        <CardTitle className="text-base font-semibold">Your Study Templates</CardTitle>
        <Link
          href={manageHref}
          className="text-xs font-medium text-sky-600 underline-offset-4 hover:underline dark:text-sky-400"
        >
          View all templates
        </Link>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          {visible.map((template, idx) => (
            <TemplateTile
              key={template.id}
              template={template}
              isDefault={idx === 0}
              manageHref={manageHref}
            />
          ))}
          {Array.from({ length: Math.max(0, 3 - visible.length) }).map((_, i) => (
            <EmptyTemplateTile key={`empty-${i}`} />
          ))}
          <CreateNewTile manageHref={manageHref} />
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateTile({
  template,
  isDefault,
  manageHref,
}: {
  template: StudyBudgetTemplate;
  isDefault: boolean;
  manageHref: string;
}) {
  return (
    <Link
      href={manageHref}
      aria-label={`${template.name} template`}
      className="group/template block rounded-md border border-border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400"
        >
          <FileText className="h-[18px] w-[18px]" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-semibold text-foreground" title={template.name}>
              {template.name}
            </div>
            {isDefault ? (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                Default
              </Badge>
            ) : null}
          </div>
          <p
            className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground"
            title={template.description ?? undefined}
          >
            {template.description ?? 'Template for clinical trials.'}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">v{template.version}</span>
        <span>Last used {formatPlanDate(template.updated_at)}</span>
      </div>
    </Link>
  );
}

function EmptyTemplateTile() {
  return (
    <div className="flex h-full min-h-[112px] items-center justify-center rounded-md border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
      No templates yet
    </div>
  );
}

function CreateNewTile({ manageHref }: { manageHref: string }) {
  return (
    <Link
      href={manageHref}
      aria-label="Create new template"
      className={cn(
        'group/create flex h-full min-h-[112px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground transition-colors',
        'hover:border-foreground/40 hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">
        <Plus className="h-4 w-4" />
      </span>
      <span className="text-sm font-semibold text-foreground">Create New Template</span>
      <span className="text-[11px] text-muted-foreground">Build a new template</span>
    </Link>
  );
}
