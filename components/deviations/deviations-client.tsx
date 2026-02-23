'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getDeviations, getDeviationStats, getCAPAs } from '@/lib/actions/deviations';
import type { Deviation, CAPA, DeviationFilters, DeviationStats } from '@/lib/types/deviations';
import { DeviationsDataTable } from './deviations-data-table';
import { DeviationFormDialog } from './deviation-form-dialog';
import { DeviationDetailSheet } from './deviation-detail-sheet';
import { CAPAFormDialog } from './capa-form-dialog';
import { CAPADetailSheet } from './capa-detail-sheet';

interface DeviationsClientProps {
  companyId: string;
  profileId: string;
}

export function DeviationsClient({ companyId, profileId }: DeviationsClientProps) {
  const [activeTab, setActiveTab] = useState('deviations');
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [capas, setCAPAs] = useState<CAPA[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<DeviationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDeviation, setShowCreateDeviation] = useState(false);
  const [showCreateCAPA, setShowCreateCAPA] = useState(false);
  const [selectedDeviation, setSelectedDeviation] = useState<Deviation | null>(null);
  const [selectedCAPA, setSelectedCAPA] = useState<CAPA | null>(null);
  const [filters, setFilters] = useState<DeviationFilters>({ page: 1, pageSize: 25 });
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [devsResult, statsResult, capasResult] = await Promise.all([
      getDeviations(companyId, filters),
      getDeviationStats(companyId),
      getCAPAs(companyId),
    ]);

    if (devsResult.success && devsResult.data) {
      setDeviations(devsResult.data.items);
      setTotal(devsResult.data.total);
    }
    if (statsResult.success && statsResult.data) setStats(statsResult.data);
    if (capasResult.success && capasResult.data) setCAPAs(capasResult.data);
    setIsLoading(false);
  }, [companyId, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats && (
          <>
            <StatCard label="Total Deviations" value={stats.total} />
            <StatCard label="Open" value={stats.open} color="text-blue-600" />
            <StatCard label="Critical" value={stats.critical} color="text-red-600" />
            <StatCard label="Total CAPAs" value={stats.total_capas} />
            <StatCard label="Open CAPAs" value={stats.open_capas} color="text-yellow-600" />
          </>
        )}
      </div>

      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <TabsList>
              <TabsTrigger value="deviations">Deviations</TabsTrigger>
              <TabsTrigger value="capas">CAPAs</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              {activeTab === 'deviations' && (
                <Button size="sm" onClick={() => setShowCreateDeviation(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  New Deviation
                </Button>
              )}
              {activeTab === 'capas' && (
                <Button size="sm" onClick={() => setShowCreateCAPA(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  New CAPA
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="deviations" className="mt-0">
              <DeviationsDataTable
                items={deviations}
                total={total}
                isLoading={isLoading}
                filters={filters}
                onFiltersChange={setFilters}
                onSelect={setSelectedDeviation}
              />
            </TabsContent>
            <TabsContent value="capas" className="mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading...</div>
              ) : capas.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">No CAPAs found</div>
              ) : (
                <div className="space-y-2">
                  {capas.map((capa) => (
                    <div
                      key={capa.id}
                      className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedCAPA(capa)}
                    >
                      <div>
                        <p className="text-sm font-medium">{capa.capa_number} — {capa.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {capa.type === 'corrective' ? 'Corrective' : 'Preventive'} · {capa.status.replace(/_/g, ' ')} · Deviation: {capa.deviation?.deviation_number || 'N/A'}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {capa.assigned_to ? `${capa.assigned_to.first_name || ''} ${capa.assigned_to.last_name || ''}`.trim() : 'Unassigned'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <DeviationFormDialog
        open={showCreateDeviation}
        onOpenChange={setShowCreateDeviation}
        companyId={companyId}
        onSuccess={() => {
          setShowCreateDeviation(false);
          loadData();
          toast({ title: 'Deviation created' });
        }}
      />

      <CAPAFormDialog
        open={showCreateCAPA}
        onOpenChange={setShowCreateCAPA}
        companyId={companyId}
        onSuccess={() => {
          setShowCreateCAPA(false);
          loadData();
          toast({ title: 'CAPA created' });
        }}
      />

      {selectedDeviation && (
        <DeviationDetailSheet
          deviation={selectedDeviation}
          companyId={companyId}
          open={!!selectedDeviation}
          onOpenChange={(open) => { if (!open) setSelectedDeviation(null); }}
          onUpdate={() => {
            loadData();
            toast({ title: 'Deviation updated' });
          }}
        />
      )}

      {selectedCAPA && (
        <CAPADetailSheet
          capa={selectedCAPA}
          open={!!selectedCAPA}
          onOpenChange={(open) => { if (!open) setSelectedCAPA(null); }}
          onUpdate={() => {
            loadData();
            toast({ title: 'CAPA updated' });
          }}
        />
      )}
    </>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border bg-white p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold ${color || ''}`}>{value}</p>
    </div>
  );
}
