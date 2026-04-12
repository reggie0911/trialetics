'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { saveBrandKit } from '@/lib/actions/brand-forge';
import { FONT_PAIRINGS } from '@/lib/brand-forge/font-pairings';
import type { BFBrandKit } from '@/lib/types/brand-forge';
import { cn } from '@/lib/utils';

interface TypographyEditorProps {
  projectId: string;
  brandKit: BFBrandKit | null;
  aiRecommendations: Record<string, unknown> | null;
}

const TYPE_SCALE = [
  { name: 'H1', size: '2rem', weight: 700 },
  { name: 'H2', size: '1.5rem', weight: 600 },
  { name: 'H3', size: '1.25rem', weight: 600 },
  { name: 'Body', size: '1rem', weight: 400 },
  { name: 'Small', size: '0.875rem', weight: 400 },
  { name: 'Caption', size: '0.75rem', weight: 400 },
];

export function TypographyEditor({ projectId, brandKit, aiRecommendations }: TypographyEditorProps) {
  const [selectedId, setSelectedId] = useState(brandKit?.font_pairing?.pairing_id ?? '');
  const [isPending, startTransition] = useTransition();

  const selectedPairing = FONT_PAIRINGS.find((fp) => fp.id === selectedId);

  const handleSave = () => {
    if (!selectedId) return;
    startTransition(async () => {
      const result = await saveBrandKit(projectId, { font_pairing: { pairing_id: selectedId } });
      if (result?.error) {
        toast.error('Failed to save typography', { description: result.error });
      } else {
        toast.success('Typography saved');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Typography</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Choose a font pairing for your study brand.</p>
        </div>
        <Button size="sm" className="text-xs" onClick={handleSave} disabled={isPending || !selectedId}>
          {isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
          Save Typography
        </Button>
      </div>

      {/* AI Recommendation */}
      {aiRecommendations && Object.keys(aiRecommendations).length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs font-medium mb-1">AI Recommendation</p>
            <p className="text-xs text-muted-foreground">
              {(aiRecommendations as Record<string, string>).heading && `Heading: ${(aiRecommendations as Record<string, string>).heading}`}
              {(aiRecommendations as Record<string, string>).body && ` | Body: ${(aiRecommendations as Record<string, string>).body}`}
              {(aiRecommendations as Record<string, string>).reasoning && ` — ${(aiRecommendations as Record<string, string>).reasoning}`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Font pairings grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FONT_PAIRINGS.map((fp) => (
          <Card
            key={fp.id}
            className={cn(
              'cursor-pointer transition-all hover:border-primary/40',
              selectedId === fp.id && 'border-primary ring-2 ring-primary/20',
            )}
            onClick={() => setSelectedId(fp.id)}
          >
            <CardContent className="p-4 space-y-2">
              <div className="text-sm font-semibold" style={{ fontFamily: `${fp.primary}, sans-serif` }}>
                {fp.primary}
              </div>
              <div className="text-xs text-muted-foreground" style={{ fontFamily: `${fp.secondary}, serif` }}>
                {fp.secondary}
              </div>
              <p className="text-[10px] text-muted-foreground">{fp.description}</p>
              <div className="flex flex-wrap gap-1">
                {fp.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Type scale preview */}
      {selectedPairing && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs">Type Scale Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {TYPE_SCALE.map((level) => (
              <div key={level.name} className="flex items-baseline gap-4">
                <span className="text-[10px] text-muted-foreground w-12 shrink-0">{level.name}</span>
                <span
                  style={{
                    fontSize: level.size,
                    fontWeight: level.weight,
                    fontFamily: level.name.startsWith('H')
                      ? `${selectedPairing.primary}, sans-serif`
                      : `${selectedPairing.secondary}, serif`,
                  }}
                >
                  Clinical study branding
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
