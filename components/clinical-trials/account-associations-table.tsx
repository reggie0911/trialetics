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
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteAccountAssociation } from '@/lib/actions/account-associations';
import type { ProtocolAccountWithRelations, RegionAccountWithRelations, SiteAccountWithRelations, EntityType } from '@/lib/types/clinical-trials';
import { ACCOUNT_TYPE_LABELS } from '@/lib/types/clinical-trials';

type AccountAssociation = ProtocolAccountWithRelations | RegionAccountWithRelations | SiteAccountWithRelations;

interface AccountAssociationsTableProps {
  accounts: AccountAssociation[];
  entityType: EntityType;
  isLoading: boolean;
  onEdit: (account: AccountAssociation) => void;
  onRefresh: () => void;
  companyId: string;
  canManage?: boolean;
}

export function AccountAssociationsTable({
  accounts,
  entityType,
  isLoading,
  onEdit,
  onRefresh,
  companyId,
  canManage = true,
}: AccountAssociationsTableProps) {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this account association?')) {
      return;
    }

    setDeletingId(id);

    const result = await deleteAccountAssociation(companyId, id, entityType);

    if (result.success) {
      toast({
        title: 'Success',
        description: 'Account association removed successfully',
      });
      onRefresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to remove account association',
        variant: 'destructive',
      });
    }

    setDeletingId(null);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading account associations...</div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Building2 className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No account associations</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Organization</TableHead>
            <TableHead className="text-xs">Account Type</TableHead>
            <TableHead className="text-xs">Start Date</TableHead>
            <TableHead className="text-xs">End Date</TableHead>
            {entityType === 'protocol' && <TableHead className="text-xs">Central</TableHead>}
            {entityType === 'region' && <TableHead className="text-xs">Regional</TableHead>}
            {canManage && <TableHead className="w-[100px] text-xs">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell className="text-xs">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {account.organization?.name || 'Unknown Organization'}
                  </span>
                  {account.organization && (
                    <span className="text-muted-foreground">
                      {account.organization.organization_type}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-xs">
                <Badge variant="outline" className="text-xs">
                  {ACCOUNT_TYPE_LABELS[account.account_type]}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{formatDate(account.start_date)}</TableCell>
              <TableCell className="text-xs">{formatDate(account.end_date)}</TableCell>
              {entityType === 'protocol' && 'is_central' in account && (
                <TableCell className="text-xs">
                  {account.is_central ? (
                    <Badge variant="default" className="text-xs">
                      Yes
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </TableCell>
              )}
              {entityType === 'region' && 'is_regional' in account && (
                <TableCell className="text-xs">
                  {account.is_regional ? (
                    <Badge variant="default" className="text-xs">
                      Yes
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </TableCell>
              )}
              {canManage && (
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(account)}
                      className="h-7 px-2"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(account.id)}
                      disabled={deletingId === account.id}
                      className="h-7 px-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
