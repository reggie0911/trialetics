'use client';

import { useState } from 'react';
import { Download, Loader2, FileImage, FileType, Image, Package, Clock, FileText, Link2, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrandKitVersionHistory } from '@/components/brand-forge/brand-kit-version-history';
import type { BFLogoConcept, BFBrandKit, BFExport, BFShareLink } from '@/lib/types/brand-forge';

interface ExportPageProps {
  projectId: string;
  projectName: string;
  brandKit: BFBrandKit | null;
  concepts: BFLogoConcept[];
  exportHistory: BFExport[];
  shareLinks?: BFShareLink[];
}

const PNG_SIZES = [1024, 512, 256];

export function ExportPage({ projectId, projectName, brandKit, concepts, exportHistory, shareLinks: initialShareLinks = [] }: ExportPageProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [shareLinks, setShareLinks] = useState<BFShareLink[]>(initialShareLinks);

  const roleMap: Record<string, string> = {};
  if (brandKit?.primary_logo_concept_id) roleMap[brandKit.primary_logo_concept_id] = 'Primary logo';
  if (brandKit?.secondary_logo_concept_id) roleMap[brandKit.secondary_logo_concept_id] = 'Secondary logo';
  if (brandKit?.icon_mark_concept_id) roleMap[brandKit.icon_mark_concept_id] = 'Icon mark';

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/brand-forge/export?projectId=${projectId}`);
      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brandkit-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download brand kit');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsPdfGenerating(true);
    try {
      const res = await fetch('/api/brand-forge/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error('PDF generation failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brand-guide-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF brand guide downloaded');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handleCreateShareLink = async () => {
    setIsCreatingLink(true);
    try {
      const res = await fetch('/api/brand-forge/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error('Failed to create share link');
      const { shareLink } = await res.json();
      setShareLinks((prev) => [shareLink, ...prev]);
      const fullUrl = `${window.location.origin}/shared/brand-kit/${shareLink.token}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success('Share link created and copied to clipboard');
    } catch {
      toast.error('Failed to create share link');
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleDeleteShareLink = async (linkId: string) => {
    try {
      await fetch('/api/brand-forge/share', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId }),
      });
      setShareLinks((prev) => prev.filter((l) => l.id !== linkId));
      toast.success('Share link deleted');
    } catch {
      toast.error('Failed to delete share link');
    }
  };

  const handleDownloadSingle = (conceptId: string, format: 'svg' | 'png', size?: number) => {
    const params = new URLSearchParams({ conceptId, format });
    // size is used when the server rasterises from SVG; when a stored PNG exists it is streamed directly.
    if (size) params.set('size', String(size));
    window.open(`/api/brand-forge/download?${params.toString()}`, '_blank');
  };

  if (!brandKit && concepts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="rounded-full bg-muted p-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-sm font-medium">No brand kit to export</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Build a brand kit first by selecting logo concepts and configuring your brand identity.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Export actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Full brand kit package</CardTitle>
            <Button size="sm" onClick={handleDownloadZip} disabled={isDownloading}>
              {isDownloading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Building ZIP…</>
              ) : (
                <><Download className="mr-2 h-4 w-4" />Download ZIP</>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Includes all logo SVGs, PNGs at multiple sizes, favicons, color palette, font info, and guidelines.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">PDF brand guide</CardTitle>
            <Button size="sm" variant="secondary" onClick={handleDownloadPdf} disabled={isPdfGenerating}>
              {isPdfGenerating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
              ) : (
                <><FileText className="mr-2 h-4 w-4" />Download PDF</>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Formatted brand guide with cover page, color palette, typography, brand direction, tone guide, and voice summary.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Share links */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Share brand kit</CardTitle>
          <Button size="sm" variant="outline" onClick={handleCreateShareLink} disabled={isCreatingLink}>
            {isCreatingLink ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="mr-2 h-4 w-4" />
            )}
            Create share link
          </Button>
        </CardHeader>
        <CardContent>
          {shareLinks.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Create a read-only share link to let collaborators view this brand kit without logging in.
            </p>
          ) : (
            <div className="space-y-2">
              {shareLinks.map((link) => {
                const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/shared/brand-kit/${link.token}`;
                const isExpired = new Date(link.expires_at) < new Date();
                return (
                  <div key={link.id} className="flex items-center justify-between rounded-md border p-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono truncate">{url}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Expires {new Date(link.expires_at).toLocaleDateString()}
                        {isExpired && <Badge variant="destructive" className="ml-2 text-[9px]">Expired</Badge>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          navigator.clipboard.writeText(url);
                          toast.success('Link copied');
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive"
                        onClick={() => handleDeleteShareLink(link.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual assets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Individual assets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {concepts.map((concept) => {
            const roleName = roleMap[concept.id] ?? `Concept ${concept.id.slice(0, 8)}`;
            return (
              <div key={concept.id} className="flex items-start gap-4 p-3 border rounded-md">
                <div className="w-16 h-16 bg-muted/30 rounded-md flex items-center justify-center border overflow-hidden shrink-0">
                  {concept.thumbnail_url ? (
                    <img src={concept.thumbnail_url} alt={roleName} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <FileImage className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium">{roleName}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleDownloadSingle(concept.id, 'svg')}
                    >
                      <FileType className="mr-1 h-3 w-3" />
                      SVG
                    </Button>
                    {PNG_SIZES.map((size) => (
                      <Button
                        key={size}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleDownloadSingle(concept.id, 'png', size)}
                      >
                        <Image className="mr-1 h-3 w-3" />
                        PNG {size}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Favicon preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Favicon preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            {[16, 32, 48].map((size) => {
              const iconConcept = concepts.find((c) => c.id === brandKit?.icon_mark_concept_id)
                ?? concepts.find((c) => c.id === brandKit?.primary_logo_concept_id);
              return (
                <div key={size} className="text-center space-y-1">
                  <div
                    className="border rounded bg-muted/30 flex items-center justify-center mx-auto"
                    style={{ width: size, height: size }}
                  >
                    {iconConcept?.thumbnail_url ? (
                      <img
                        src={iconConcept.thumbnail_url}
                        alt={`${size}px`}
                        style={{ width: size, height: size }}
                        className="object-contain"
                      />
                    ) : (
                      <span className="text-[8px] text-muted-foreground">{size}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{size}px</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Version history */}
      <BrandKitVersionHistory projectId={projectId} />

      {/* Export history */}
      {exportHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Export history</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {exportHistory.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between text-sm p-2 border rounded-md">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{new Date(exp.created_at).toLocaleString()}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{exp.export_type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
