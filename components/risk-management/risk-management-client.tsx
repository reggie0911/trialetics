'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  getRisksForCompany,
  getRiskRegisterSummary,
  getRiskHeatmapData,
} from '@/lib/actions/risk-dashboard';
import type {
  ProtocolRisk,
  RiskRegisterSummary,
  RiskHeatmapCell,
  RiskDashboardFilters,
} from '@/lib/types/risk-management';
import { RiskRegisterTable } from './risk-register-table';
import { RiskFormDialog } from './risk-form-dialog';
import { RiskHeatmap } from './risk-heatmap';
import { RiskResolutionPanel } from './risk-resolution-panel';
import { RiskAssessmentList } from './risk-assessment-list';
import { RiskGovernancePanel } from './risk-governance-panel';
import { Button } from '@/components/ui/button';

interface RiskManagementClientProps {
  companyId: string;
  profileId: string;
}

function SummaryCard({ label, value, variant }: { label: string; value: number; variant?: string }) {
  const colorMap: Record<string, string> = {
    critical: 'text-red-600',
    high: 'text-orange-600',
    medium: 'text-yellow-600',
    low: 'text-green-600',
    default: '',
  };
  return (
    <div className="rounded-lg border bg-white p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold ${colorMap[variant || 'default'] || ''}`}>{value}</p>
    </div>
  );
}

export function RiskManagementClient({ companyId, profileId }: RiskManagementClientProps) {
  const { toast } = useToast();
  const [risks, setRisks] = useState<ProtocolRisk[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<RiskRegisterSummary[]>([]);
  const [heatmapData, setHeatmapData] = useState<RiskHeatmapCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<RiskDashboardFilters>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<ProtocolRisk | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<ProtocolRisk | null>(null);

  const load = async () => {
    setLoading(true);
    const [risksRes, summaryRes, heatmapRes] = await Promise.all([
      getRisksForCompany(companyId, filters),
      getRiskRegisterSummary(companyId, filters.protocolId),
      getRiskHeatmapData(companyId, filters.protocolId),
    ]);
    if (risksRes.success && risksRes.data) {
      setRisks(risksRes.data.items);
      setTotal(risksRes.data.total);
    }
    if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data);
    if (heatmapRes.success && heatmapRes.data) setHeatmapData(heatmapRes.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [companyId, filters]);

  const aggregated = summary.reduce(
    (acc, s) => ({
      total: acc.total + s.total_risks,
      open: acc.open + s.open_risks,
      critical: acc.critical + s.critical_risks,
      high: acc.high + s.high_risks,
      medium: acc.medium + s.medium_risks,
      low: acc.low + s.low_risks,
    }),
    { total: 0, open: 0, critical: 0, high: 0, medium: 0, low: 0 }
  );

  const handleEdit = (risk: ProtocolRisk) => {
    setEditingRisk(risk);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingRisk(null);
    setFormOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Loading risk data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Total Risks" value={aggregated.total} />
        <SummaryCard label="Open" value={aggregated.open} />
        <SummaryCard label="Critical" value={aggregated.critical} variant="critical" />
        <SummaryCard label="High" value={aggregated.high} variant="high" />
        <SummaryCard label="Medium" value={aggregated.medium} variant="medium" />
        <SummaryCard label="Low" value={aggregated.low} variant="low" />
      </div>

      <Tabs defaultValue="register" className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="register">Risk Register</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="governance">Governance</TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={handleCreate}>
            Add Risk
          </Button>
        </div>

        <TabsContent value="register" className="mt-4">
          <RiskRegisterTable
            risks={risks}
            total={total}
            filters={filters}
            onFiltersChange={setFilters}
            onEdit={handleEdit}
            onSelect={setSelectedRisk}
            onRefresh={load}
            companyId={companyId}
          />
          {selectedRisk && (
            <div className="mt-4">
              <RiskResolutionPanel
                risk={selectedRisk}
                onClose={() => setSelectedRisk(null)}
                onRefresh={load}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="heatmap" className="mt-4">
          <RiskHeatmap data={heatmapData} />
        </TabsContent>

        <TabsContent value="assessments" className="mt-4">
          <RiskAssessmentList companyId={companyId} />
        </TabsContent>

        <TabsContent value="governance" className="mt-4">
          <RiskGovernancePanel risks={risks} onRefresh={load} />
        </TabsContent>
      </Tabs>

      <RiskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        risk={editingRisk}
        companyId={companyId}
        onSuccess={() => {
          setFormOpen(false);
          setEditingRisk(null);
          load();
        }}
      />
    </div>
  );
}
