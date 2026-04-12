'use client';

import { useState } from 'react';
import { Loader2, Megaphone, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BFRecruitmentKit } from '@/lib/types/brand-forge';

interface RecruitmentKitEditorProps {
  projectId: string;
  recruitmentKit: BFRecruitmentKit | null;
}

export function RecruitmentKitEditor({ projectId, recruitmentKit }: RecruitmentKitEditorProps) {
  const [kit, setKit] = useState<BFRecruitmentKit | null>(recruitmentKit);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/brand-forge/generate-recruitment-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      setKit(data);
      toast.success('Recruitment kit generated');
    } catch {
      toast.error('Failed to generate recruitment kit');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Recruitment Creative Kit</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI-generated creative direction for patient recruitment materials.
          </p>
        </div>
        <Button size="sm" className="text-xs" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Generating...</>
          ) : (
            <><Sparkles className="mr-2 h-3 w-3" />{kit ? 'Regenerate' : 'Generate'} Kit</>
          )}
        </Button>
      </div>

      {kit ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Campaign palette */}
          {kit.campaign_palette?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Campaign Palette</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {kit.campaign_palette.map((swatch, i) => (
                    <div key={i} className="text-center">
                      <div
                        className="w-10 h-10 rounded-md border border-border"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      <span className="text-[10px] text-muted-foreground mt-1 block">{swatch.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Headline styles */}
          {kit.headline_styles?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Headline Styles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {kit.headline_styles.map((h, i) => (
                  <div key={i} className="rounded-lg border p-2">
                    <p className="text-xs font-medium">{h.template}</p>
                    <p className="text-[10px] text-muted-foreground">{h.tone}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Brochure tone */}
          {kit.brochure_tone && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Brochure Tone</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">{kit.brochure_tone}</p>
              </CardContent>
            </Card>
          )}

          {/* Social ad direction */}
          {kit.social_ad_direction && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Social Ad Creative Direction</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">{kit.social_ad_direction}</p>
              </CardContent>
            </Card>
          )}

          {/* Diversity guidance */}
          {kit.diversity_imagery_guidance && (
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Diversity-Sensitive Imagery Guidance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">{kit.diversity_imagery_guidance}</p>
              </CardContent>
            </Card>
          )}

          {/* CTA styles */}
          {kit.cta_styles?.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Call-to-Action Styles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {kit.cta_styles.map((cta, i) => (
                    <div
                      key={i}
                      className="rounded-lg px-4 py-2 text-xs font-medium text-white"
                      style={{ backgroundColor: cta.color }}
                    >
                      {cta.label}
                      <span className="block text-[10px] opacity-75 mt-0.5">{cta.urgency} urgency</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="rounded-full bg-muted p-4">
              <Megaphone className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xs font-medium">No recruitment kit yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Generate a recruitment creative kit to get campaign palettes, headline styles, CTA guidance, and diversity-sensitive imagery direction.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
