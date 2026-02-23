'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { deleteProtocolRisk } from '@/lib/actions/protocol-risks';
import type { ProtocolRisk, RiskDashboardFilters } from '@/lib/types/risk-management';
import {
  RISK_LEVEL_LABELS,
  RISK_STATUS_LABELS,
  RISK_CATEGORY_LABELS,
} from '@/lib/types/risk-management';

interface RiskRegisterTableProps {
  risks: ProtocolRisk[];
  total: number;
  filters: RiskDashboardFilters;
  onFiltersChange: (filters: RiskDashboardFilters) => void;
  onEdit: (risk: ProtocolRisk) => void;
  onSelect: (risk: ProtocolRisk) => void;
  onRefresh: () => void;
  companyId: string;
}

const levelColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

export function RiskRegisterTable({
  risks,
  total,
  filters,
  onFiltersChange,
  onEdit,
  onSelect,
  onRefresh,
  companyId,
}: RiskRegisterTableProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (riskId: string) => {
    setDeleting(riskId);
    const res = await deleteProtocolRisk(riskId);
    setDeleting(null);
    if (res.success) {
      toast({ title: 'Risk deleted' });
      onRefresh();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search risks..."
          className="w-48"
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value, page: 1 })}
        />
        <Select
          value={filters.riskLevel || 'all'}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, riskLevel: v as RiskDashboardFilters['riskLevel'], page: 1 })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Risk Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, status: v as RiskDashboardFilters['status'], page: 1 })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.category || 'all'}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, category: v as RiskDashboardFilters['category'], page: 1 })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(RISK_CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>L x I</TableHead>
              <TableHead>Identified</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {risks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No risks found
                </TableCell>
              </TableRow>
            ) : (
              risks.map((risk) => (
                <TableRow
                  key={risk.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSelect(risk)}
                >
                  <TableCell className="font-medium">{risk.title}</TableCell>
                  <TableCell>
                    {risk.category ? RISK_CATEGORY_LABELS[risk.category] || risk.category : '—'}
                  </TableCell>
                  <TableCell>
                    {risk.risk_level ? (
                      <Badge variant="outline" className={levelColors[risk.risk_level]}>
                        {RISK_LEVEL_LABELS[risk.risk_level]}
                      </Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[risk.status]}>
                      {RISK_STATUS_LABELS[risk.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {risk.likelihood && risk.impact
                      ? `${risk.likelihood} x ${risk.impact} = ${risk.likelihood * risk.impact}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {risk.identified_date
                      ? new Date(risk.identified_date).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => onEdit(risk)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={deleting === risk.id}
                        onClick={() => handleDelete(risk.id)}
                      >
                        {deleting === risk.id ? '...' : 'Delete'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > (filters.pageSize || 25) && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {risks.length} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={(filters.page || 1) <= 1}
              onClick={() => onFiltersChange({ ...filters, page: (filters.page || 1) - 1 })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={risks.length < (filters.pageSize || 25)}
              onClick={() => onFiltersChange({ ...filters, page: (filters.page || 1) + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
