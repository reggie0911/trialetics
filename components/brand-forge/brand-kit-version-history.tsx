'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/client';
import type { BFBrandKitVersion } from '@/lib/types/brand-forge';

interface BrandKitVersionHistoryProps {
  projectId: string;
}

export function BrandKitVersionHistory({ projectId }: BrandKitVersionHistoryProps) {
  const router = useRouter();
  const [versions, setVersions] = useState<BFBrandKitVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: kit } = await supabase
        .from('bf_brand_kits')
        .select('id')
        .eq('project_id', projectId)
        .maybeSingle();

      if (kit) {
        const { data } = await supabase
          .from('bf_brand_kit_versions')
          .select('*')
          .eq('brand_kit_id', kit.id)
          .order('version_number', { ascending: false })
          .limit(20);
        setVersions((data as unknown as BFBrandKitVersion[]) ?? []);
      }
      setIsLoading(false);
    }
    load();
  }, [projectId]);

  const handleRestore = async (version: BFBrandKitVersion) => {
    setRestoring(version.id);
    try {
      const snapshot = version.snapshot as Record<string, unknown>;
      const supabase = createClient();
      const { error } = await supabase
        .from('bf_brand_kits')
        .update({
          color_palette: snapshot.color_palette,
          font_pairing: snapshot.font_pairing,
          brand_voice_summary: snapshot.brand_voice_summary,
          usage_guidance: snapshot.usage_guidance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', version.brand_kit_id);

      if (error) throw error;
      toast.success(`Restored to version ${version.version_number}`);
      router.refresh();
    } catch {
      toast.error('Failed to restore version');
    } finally {
      setRestoring(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
          <Clock className="h-6 w-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">No version history yet. Versions are created when you save changes to the brand kit.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs flex items-center gap-2">
          <Clock className="h-3 w-3" /> Version History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {versions.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded-lg border p-2">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">v{v.version_number}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(v.created_at).toLocaleDateString()} {new Date(v.created_at).toLocaleTimeString()}
                </span>
              </div>
              {v.change_summary && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{v.change_summary}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => handleRestore(v)}
              disabled={restoring === v.id}
            >
              {restoring === v.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <><RotateCcw className="h-3 w-3 mr-1" /> Restore</>
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
