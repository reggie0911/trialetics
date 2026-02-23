'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getSupplyInventory, getSupplyItems } from '@/lib/actions/randomization-supply';
import type { SupplyInventory, SupplyItem } from '@/lib/types/randomization-supply';
import { SUPPLY_STATUS_LABELS } from '@/lib/types/randomization-supply';
import { SupplyItemDialog } from './supply-item-dialog';

interface SupplyInventoryTableProps {
  companyId: string;
}

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  reserved: 'bg-blue-100 text-blue-800',
  dispensed: 'bg-purple-100 text-purple-800',
  expired: 'bg-red-100 text-red-800',
  returned: 'bg-yellow-100 text-yellow-800',
  destroyed: 'bg-gray-100 text-gray-800',
};

export function SupplyInventoryTable({ companyId }: SupplyInventoryTableProps) {
  const [inventory, setInventory] = useState<SupplyInventory[]>([]);
  const [items, setItems] = useState<SupplyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [invRes, itemsRes] = await Promise.all([
      getSupplyInventory(companyId),
      getSupplyItems(companyId),
    ]);
    if (invRes.success && invRes.data) setInventory(invRes.data);
    if (itemsRes.success && itemsRes.data) setItems(itemsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [companyId]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-sm font-medium">Supply Items ({items.length})</h3>
            <p className="text-xs text-muted-foreground">Drug and device catalog</p>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>Add Item</Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No supply items configured</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead>Shelf Life</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.item_code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-xs">{item.storage_conditions || '—'}</TableCell>
                  <TableCell>{item.shelf_life_months ? `${item.shelf_life_months}mo` : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {inventory.length > 0 && (
        <div className="rounded-lg border bg-white">
          <div className="p-4 border-b">
            <h3 className="text-sm font-medium">Inventory Lots ({inventory.length})</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Lot #</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Dispensed</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">
                    {(inv.supply_item as SupplyItem | null)?.name || inv.supply_item_id}
                  </TableCell>
                  <TableCell>{inv.lot_number}</TableCell>
                  <TableCell className="text-right">{inv.quantity_available}</TableCell>
                  <TableCell className="text-right">{inv.quantity_reserved}</TableCell>
                  <TableCell className="text-right">{inv.quantity_dispensed}</TableCell>
                  <TableCell>
                    {inv.expiry_date ? new Date(inv.expiry_date).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[inv.status]}>
                      {SUPPLY_STATUS_LABELS[inv.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SupplyItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          setDialogOpen(false);
          load();
        }}
      />
    </div>
  );
}
