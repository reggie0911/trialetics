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
import { Badge } from '@/components/ui/badge';
import { getSupplyShipments } from '@/lib/actions/randomization-supply';
import type { SupplyShipment } from '@/lib/types/randomization-supply';
import { SHIPMENT_STATUS_LABELS } from '@/lib/types/randomization-supply';

interface SupplyShipmentTableProps {
  companyId: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_transit: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  confirmed: 'bg-purple-100 text-purple-800',
};

export function SupplyShipmentTable({ companyId }: SupplyShipmentTableProps) {
  const [shipments, setShipments] = useState<SupplyShipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await getSupplyShipments(companyId);
      if (res.success && res.data) setShipments(res.data);
      setLoading(false);
    };
    load();
  }, [companyId]);

  return (
    <div className="rounded-lg border bg-white">
      <div className="p-4 border-b">
        <h3 className="text-sm font-medium">Shipments</h3>
        <p className="text-xs text-muted-foreground">Track supply shipments to sites</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>To Site</TableHead>
              <TableHead>Tracking #</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Shipped</TableHead>
              <TableHead>Delivered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No shipments recorded
                </TableCell>
              </TableRow>
            ) : (
              shipments.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.from_location || '—'}</TableCell>
                  <TableCell>{s.to_site_id || '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{s.tracking_number || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[s.status]}>
                      {SHIPMENT_STATUS_LABELS[s.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {s.shipped_at ? new Date(s.shipped_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>
                    {s.delivered_at ? new Date(s.delivered_at).toLocaleDateString() : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
