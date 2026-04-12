'use client';

import { useState } from 'react';
import { Loader2, FileText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BFMaterialTheme } from '@/lib/types/brand-forge';

interface MaterialsThemeEditorProps {
  projectId: string;
  materialTheme: BFMaterialTheme | null;
}

function ThemeSection({ title, data }: { title: string; data: Record<string, unknown> | null | undefined }) {
  if (!data || Object.keys(data).length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="text-xs">
              <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}: </span>
              <span className="font-medium">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function MaterialsThemeEditor({ projectId, materialTheme }: MaterialsThemeEditorProps) {
  const [theme, setTheme] = useState<BFMaterialTheme | null>(materialTheme);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/brand-forge/generate-material-themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      setTheme(data);
      toast.success('Material themes generated');
    } catch {
      toast.error('Failed to generate material themes');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Trial Materials Themes</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI-generated styling guides for SIV decks, newsletters, training manuals, and other study documents.
          </p>
        </div>
        <Button size="sm" className="text-xs" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Generating...</>
          ) : (
            <><Sparkles className="mr-2 h-3 w-3" />{theme ? 'Regenerate' : 'Generate'} Themes</>
          )}
        </Button>
      </div>

      {theme ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <ThemeSection title="SIV Deck Styling" data={theme.siv_deck_styling} />
          <ThemeSection title="Monitoring Visit Styling" data={theme.monitoring_visit_styling} />
          <ThemeSection title="Newsletter Styling" data={theme.newsletter_styling} />
          <ThemeSection title="Training Manual Styling" data={theme.training_manual_styling} />
          <ThemeSection title="PowerPoint Theme" data={theme.powerpoint_theme} />
          <ThemeSection title="PDF Styling" data={theme.pdf_styling} />
          <ThemeSection title="One-Pager Layout" data={theme.one_pager_layout} />
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="rounded-full bg-muted p-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xs font-medium">No material themes yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Generate styling guides for your study documents, including deck themes, PDF styling rules, newsletter templates, and training manuals.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
