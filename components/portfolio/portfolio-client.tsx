'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  getPortfolioSummary,
  getPortfolioKPISnapshots,
  getPortfolioViews,
  generateKPISnapshot,
} from '@/lib/actions/portfolio';
import type { PortfolioKPISnapshot, PortfolioSummary } from '@/lib/types/portfolio';
import { PortfolioHealthCards } from './portfolio-health-cards';
import { PortfolioKPIGrid } from './portfolio-kpi-grid';
import { PortfolioViewDialog } from './portfolio-view-dialog';

interface PortfolioClientProps {
  companyId: string;
  profileId: string;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function PortfolioClient({ companyId }: PortfolioClientProps) {
  const { toast } = useToast();
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [snapshots, setSnapshots] = useState<PortfolioKPISnapshot[]>([]);
  const [views, setViews] = useState<{ items: { protocol_ids: string[] }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [summaryRes, snapshotsRes, viewsRes] = await Promise.all([
      getPortfolioSummary(companyId),
      getPortfolioKPISnapshots(companyId),
      getPortfolioViews(companyId),
    ]);
    if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data);
    if (snapshotsRes.success && snapshotsRes.data) setSnapshots(snapshotsRes.data);
    if (viewsRes.success && viewsRes.data) setViews(viewsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [companyId]);

  const latestSnapshots = useMemo(() => {
    const byProtocol = new Map<string, PortfolioKPISnapshot>();
    for (const s of snapshots) {
      if (!byProtocol.has(s.protocol_id)) {
        byProtocol.set(s.protocol_id, s);
      }
    }
    return Array.from(byProtocol.values());
  }, [snapshots]);

  const protocolIdsToGenerate = useMemo(() => {
    const ids = new Set<string>();
    for (const v of views?.items ?? []) {
      for (const id of v.protocol_ids ?? []) ids.add(id);
    }
    for (const s of snapshots) ids.add(s.protocol_id);
    return Array.from(ids);
  }, [views, snapshots]);

  const handleGenerateSnapshots = async () => {
    if (protocolIdsToGenerate.length === 0) {
      toast({ title: 'No protocols to snapshot', description: 'Create a portfolio view or add protocols first.', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    let ok = 0;
    let err = 0;
    for (const pid of protocolIdsToGenerate) {
      const res = await generateKPISnapshot(pid);
      if (res.success) ok++;
      else err++;
    }
    setGenerating(false);
    await load();
    if (err > 0) {
      toast({ title: 'Snapshot generation completed with errors', description: `${ok} succeeded, ${err} failed.`, variant: 'destructive' });
    } else {
      toast({ title: 'Snapshots generated', description: `${ok} protocol(s) updated.` });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Loading portfolio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Portfolio Overview</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(true)}>
            New Portfolio View
          </Button>
          <Button
            size="sm"
            onClick={handleGenerateSnapshots}
            disabled={generating || protocolIdsToGenerate.length === 0}
          >
            {generating ? 'Generating...' : 'Generate Snapshots'}
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard label="Total Protocols" value={summary.total_protocols} />
          <StatCard label="On Track" value={summary.on_track} />
          <StatCard label="At Risk" value={summary.at_risk} />
          <StatCard label="Critical" value={summary.critical} />
          <StatCard label="Total Budget" value={formatCurrency(summary.total_budget)} />
          <StatCard label="Total Spent" value={formatCurrency(summary.total_spent)} />
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-medium">Protocol Health</h3>
        <PortfolioHealthCards snapshots={latestSnapshots} />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium">KPI Comparison</h3>
        <PortfolioKPIGrid snapshots={latestSnapshots} />
      </div>

      <PortfolioViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        onSuccess={load}
      />
    </div>
  );
}
