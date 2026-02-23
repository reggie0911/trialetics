'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getAccessAuditLog } from '@/lib/actions/rbac';
import type { AccessAuditEntry } from '@/lib/types/rbac';
import { ACCESS_AUDIT_ACTION_LABELS } from '@/lib/types/rbac';

interface AccessAuditLogProps {
  companyId: string;
}

export function AccessAuditLog({ companyId }: AccessAuditLogProps) {
  const [entries, setEntries] = useState<AccessAuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const pageSize = 25;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const result = await getAccessAuditLog(companyId, page, pageSize);
    if (result.success && result.data) {
      setEntries(result.data.entries);
      setTotal(result.data.total);
    }
    setIsLoading(false);
  }, [companyId, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalPages = Math.ceil(total / pageSize);

  const getName = (p: { first_name: string | null; last_name: string | null } | null | undefined) => {
    if (!p) return 'System';
    return `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown';
  };

  const actionBadgeVariant = (action: string) => {
    if (action.includes('granted')) return 'default' as const;
    if (action.includes('revoked')) return 'destructive' as const;
    return 'secondary' as const;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Access Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">No access audit entries</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Timestamp</TableHead>
                  <TableHead className="text-xs">Action</TableHead>
                  <TableHead className="text-xs">Target User</TableHead>
                  <TableHead className="text-xs">Module</TableHead>
                  <TableHead className="text-xs">Performed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs">
                      {new Date(entry.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionBadgeVariant(entry.action)} className="text-[10px]">
                        {ACCESS_AUDIT_ACTION_LABELS[entry.action as keyof typeof ACCESS_AUDIT_ACTION_LABELS] || entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{getName(entry.target_user)}</TableCell>
                    <TableCell className="text-xs">
                      {entry.module?.name?.replace(/_/g, ' ') || '-'}
                    </TableCell>
                    <TableCell className="text-xs">{getName(entry.performed_by)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs px-2">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
