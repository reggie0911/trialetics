'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getActionItems, getActionItemStats } from '@/lib/actions/action-items';
import type { ActionItem, ActionItemFilters, ActionItemStats } from '@/lib/types/action-items';
import { ActionItemsDataTable } from './action-items-data-table';
import { ActionItemFormDialog } from './action-item-form-dialog';
import { ActionItemDetailSheet } from './action-item-detail-sheet';

interface ActionItemsClientProps {
  companyId: string;
  profileId: string;
}

export function ActionItemsClient({ companyId, profileId }: ActionItemsClientProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [items, setItems] = useState<ActionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<ActionItemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ActionItem | null>(null);
  const [filters, setFilters] = useState<ActionItemFilters>({ page: 1, pageSize: 25 });
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const tabFilters: ActionItemFilters = { ...filters };
    if (activeTab === 'my-items') tabFilters.assigned_to_id = profileId;
    if (activeTab === 'overdue') tabFilters.overdue_only = true;

    const [itemsResult, statsResult] = await Promise.all([
      getActionItems(companyId, tabFilters),
      getActionItemStats(companyId),
    ]);

    if (itemsResult.success && itemsResult.data) {
      setItems(itemsResult.data.items);
      setTotal(itemsResult.data.total);
    }
    if (statsResult.success && statsResult.data) {
      setStats(statsResult.data);
    }
    setIsLoading(false);
  }, [companyId, profileId, activeTab, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  return (
    <>
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {stats && (
          <>
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Open" value={stats.open} color="text-blue-600" />
            <StatCard label="In Progress" value={stats.in_progress} color="text-yellow-600" />
            <StatCard label="Resolved" value={stats.resolved} color="text-green-600" />
            <StatCard label="Closed" value={stats.closed} color="text-gray-500" />
            <StatCard label="Overdue" value={stats.overdue} color="text-red-600" />
            <StatCard label="Critical" value={stats.critical} color="text-red-700" />
          </>
        )}
      </div>

      <Card>
        <Tabs tabsId="action-items" value={activeTab} onValueChange={handleTabChange}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <TabsList>
              <TabsTrigger value="all">All Items</TabsTrigger>
              <TabsTrigger value="my-items">My Items</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
            </TabsList>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-1 h-4 w-4" />
              New Action Item
            </Button>
          </CardHeader>
          <CardContent>
            <TabsContent value={activeTab} className="mt-0">
              <ActionItemsDataTable
                items={items}
                total={total}
                isLoading={isLoading}
                filters={filters}
                onFiltersChange={setFilters}
                onSelect={setSelectedItem}
              />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <ActionItemFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          loadData();
          toast({ title: 'Action item created' });
        }}
      />

      {selectedItem && (
        <ActionItemDetailSheet
          item={selectedItem}
          open={!!selectedItem}
          onOpenChange={(open) => { if (!open) setSelectedItem(null); }}
          onUpdate={() => {
            loadData();
            toast({ title: 'Action item updated' });
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
