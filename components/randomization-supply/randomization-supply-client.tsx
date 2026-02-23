'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSupplyDashboard } from '@/lib/actions/randomization-supply';
import type { SupplyDashboardData } from '@/lib/types/randomization-supply';
import { RandomizationListTable } from './randomization-list-table';
import { SupplyInventoryTable } from './supply-inventory-table';
import { SupplyShipmentTable } from './supply-shipment-table';

interface RandomizationSupplyClientProps {
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

export function RandomizationSupplyClient({ companyId, profileId }: RandomizationSupplyClientProps) {
  const [dashboard, setDashboard] = useState<SupplyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await getSupplyDashboard(companyId);
      if (res.success && res.data) setDashboard(res.data);
      setLoading(false);
    };
    load();
  }, [companyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {dashboard && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Supply Items" value={dashboard.total_items} />
          <StatCard label="Inventory Lots" value={dashboard.total_lots} />
          <StatCard label="Available Units" value={dashboard.available_units} />
          <StatCard label="Expiring Soon" value={dashboard.expiring_soon} />
          <StatCard label="Pending Shipments" value={dashboard.pending_shipments} />
          <StatCard label="In Transit" value={dashboard.in_transit_shipments} />
        </div>
      )}

      <Tabs defaultValue="randomization" className="w-full">
        <TabsList>
          <TabsTrigger value="randomization">Randomization</TabsTrigger>
          <TabsTrigger value="inventory">Supply Inventory</TabsTrigger>
          <TabsTrigger value="shipments">Shipments</TabsTrigger>
        </TabsList>

        <TabsContent value="randomization" className="mt-4">
          <RandomizationListTable companyId={companyId} />
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <SupplyInventoryTable companyId={companyId} />
        </TabsContent>

        <TabsContent value="shipments" className="mt-4">
          <SupplyShipmentTable companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
