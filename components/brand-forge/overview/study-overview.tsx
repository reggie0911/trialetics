'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Loader2,
  Sparkles,
  Palette,
  Type,
  Image,
  ArrowRight,
  CheckCircle2,
  Circle,
  SquarePen,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { brandForgePath, brandForgeStudyIdFromPathname } from '@/lib/nav/brand-forge-paths';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  PHASES,
  THERAPEUTIC_AREAS,
  TRIAL_TYPES,
  BRAND_DIRECTIONS,
  VISUAL_PREFERENCES,
  TARGET_AUDIENCES,
  SEVERITIES,
  type BFBrandInputs,
  type BFBrandDirection,
  type BFWorkspaceStatus,
} from '@/lib/types/brand-forge';

interface StudyOverviewProps {
  projectId: string;
  projectName: string;
  projectStatus: string;
  brandInputs: BFBrandInputs | null;
  brandDirection: BFBrandDirection | null;
  workspaceStatus: BFWorkspaceStatus;
}

function lookupLabel(items: readonly { id?: string; label?: string }[] | readonly string[], id: string): string {
  for (const item of items) {
    if (typeof item === 'string') {
      if (item === id) return item;
    } else {
      if ((item as { id: string }).id === id) return (item as { label: string }).label;
    }
  }
  return id;
}

function StatusDot({ done }: { done: boolean }) {
  return done
    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
    : <Circle className="h-4 w-4 text-muted-foreground/40" />;
}

export function StudyOverview({
  projectId,
  projectName,
  projectStatus,
  brandInputs,
  brandDirection,
  workspaceStatus,
}: StudyOverviewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const studyId = brandForgeStudyIdFromPathname(pathname);
  const [isGenerating, setIsGenerating] = useState(false);
  const [direction, setDirection] = useState<BFBrandDirection | null>(brandDirection);
  const [, startTransition] = useTransition();

  const handleGenerateDirection = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/brand-forge/generate-direction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string } & BFBrandDirection;
      if (!res.ok) {
        const msg =
          typeof data.error === 'string' && data.error.length > 0
            ? data.error
            : `Request failed (${res.status})`;
        throw new Error(msg);
      }
      if (typeof data.error === 'string' && data.error.length > 0) {
        throw new Error(data.error);
      }
      setDirection(data as BFBrandDirection);
      router.refresh();
      toast.success('Brand direction generated');
    } catch (err) {
      const description = err instanceof Error ? err.message : 'Something went wrong';
      toast.error('Failed to generate brand direction', { description });
    } finally {
      setIsGenerating(false);
    }
  };

  const inputs = brandInputs;
  const editStudyHref = `${brandForgePath(studyId, projectId, 'edit')}?returnTo=overview`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{projectName}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Study Overview</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" className="text-xs h-8 shrink-0" asChild>
            <Link href={editStudyHref}>
              <SquarePen className="mr-1.5 h-3 w-3" aria-hidden />
              Edit study information
            </Link>
          </Button>
          <Badge variant="outline" className="capitalize shrink-0">{projectStatus}</Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Study Metadata */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm">Study Information</CardTitle>
            <Button variant="outline" size="sm" className="text-xs h-8 shrink-0" asChild>
              <Link href={editStudyHref}>
                <SquarePen className="mr-1.5 h-3 w-3" aria-hidden />
                Edit study information
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {!inputs && (
              <p className="text-xs text-muted-foreground">
                No study information on file. Use Edit study information to add your brief.
              </p>
            )}
            {inputs && (
              <div className="grid gap-2 text-xs">
                {inputs.protocol_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Protocol</span>
                    <span className="font-mono font-medium">{inputs.protocol_number}</span>
                  </div>
                )}
                {inputs.sponsor && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sponsor</span>
                    <span className="font-medium">{inputs.sponsor}</span>
                  </div>
                )}
                {inputs.cro && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CRO</span>
                    <span className="font-medium">{inputs.cro}</span>
                  </div>
                )}
                {inputs.phase && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phase</span>
                    <span className="font-medium">{lookupLabel(PHASES, inputs.phase)}</span>
                  </div>
                )}
                {inputs.therapeutic_area && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Therapeutic Area</span>
                    <span className="font-medium">{inputs.therapeutic_area}</span>
                  </div>
                )}
                {inputs.indication && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Indication</span>
                    <span className="font-medium">{inputs.indication}</span>
                  </div>
                )}
                {inputs.severity && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Severity</span>
                    <span className="font-medium">{lookupLabel(SEVERITIES, inputs.severity)}</span>
                  </div>
                )}
                {inputs.patient_population && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Population</span>
                    <span className="font-medium text-right max-w-[55%]">{inputs.patient_population}</span>
                  </div>
                )}
                {inputs.countries?.length > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground">Countries</span>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[55%]">
                      {inputs.countries.map((c) => (
                        <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Workspace Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {[
                { label: 'Brand Direction', done: !!direction, href: '' },
                { label: 'Logos', done: workspaceStatus.logos, href: brandForgePath(studyId, projectId, 'logos') },
                { label: 'Colors', done: workspaceStatus.colors, href: brandForgePath(studyId, projectId, 'colors') },
                { label: 'Typography', done: workspaceStatus.typography, href: brandForgePath(studyId, projectId, 'typography') },
                { label: 'Imagery', done: workspaceStatus.imagery, href: brandForgePath(studyId, projectId, 'imagery') },
                { label: 'Mockups', done: workspaceStatus.mockups, href: brandForgePath(studyId, projectId, 'mockups') },
                { label: 'Recruitment', done: workspaceStatus.recruitment, href: brandForgePath(studyId, projectId, 'recruitment') },
                { label: 'Templates', done: workspaceStatus.templates, href: brandForgePath(studyId, projectId, 'templates') },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <StatusDot done={item.done} />
                    <span>{item.label}</span>
                  </div>
                  {item.href && (
                    <Link href={item.href} className="text-primary hover:underline flex items-center gap-1">
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Button
                size="sm"
                className="w-full text-xs"
                onClick={() => startTransition(handleGenerateDirection)}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Generating...</>
                ) : (
                  <><Sparkles className="mr-2 h-3 w-3" />{direction ? 'Regenerate' : 'Generate'} Brand Direction</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Brand Direction Output */}
      {direction && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">AI Brand Direction</h3>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Sparkles className="h-3 w-3" /> Mood & Tone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">{direction.mood}</p>
                {direction.visual_direction && (
                  <p className="text-xs text-muted-foreground leading-relaxed mt-2">{direction.visual_direction}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Palette className="h-3 w-3" /> Color Palette
                </CardTitle>
              </CardHeader>
              <CardContent>
                {direction.color_palette && direction.color_palette.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {direction.color_palette.map((swatch) => (
                      <div key={swatch.hex} className="text-center">
                        <div
                          className="w-8 h-8 rounded-md border border-border"
                          style={{ backgroundColor: swatch.hex }}
                          title={swatch.name}
                        />
                        <span className="text-[10px] text-muted-foreground mt-1 block">{swatch.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Type className="h-3 w-3" /> Tagline Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                {direction.tagline_options?.length > 0 && (
                  <ul className="space-y-1.5">
                    {direction.tagline_options.map((t, i) => (
                      <li key={i} className="text-xs text-muted-foreground italic">&ldquo;{t}&rdquo;</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {direction.logo_directions && direction.logo_directions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Image className="h-3 w-3" /> Logo Directions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  {direction.logo_directions.map((d, i) => (
                    <div key={i} className="rounded-lg border p-3">
                      <p className="text-xs font-medium">{d.style}</p>
                      <p className="text-xs text-muted-foreground mt-1">{d.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
