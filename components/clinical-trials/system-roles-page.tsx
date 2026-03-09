'use client';

import { useState, useEffect, useCallback } from 'react';


import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { Plus, UserCheck } from 'lucide-react';
import { useCTMS } from './ctms-context';
import { CTMSPageHeader } from './ctms-layout';

const roles: {
  name: string;
  type: string;
  description: string;
  active: boolean;
}[] = [];

export function SystemRolesPage() {
  const { companyId } = useCTMS();
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Placeholder - load roles when API exists
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CTMSPageHeader title="System Roles" subtitle="User roles and permissions">
        <Button variant="default" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </CTMSPageHeader>

      <div className="rounded-md border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-medium flex items-center gap-2">Roles</h3>
        </div>
        <div className="px-4 pb-4">
          {roles.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <UserCheck className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No roles found</EmptyTitle>
                <EmptyDescription>
                  Add roles to manage user permissions.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50 text-xs font-medium">Role Name</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Role Type</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Description</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((r, i) => (
                  <TableRow key={i} className="hover:bg-muted/50">
                    <TableCell className="text-xs font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs">{r.type}</TableCell>
                    <TableCell className="text-xs">{r.description}</TableCell>
                    <TableCell className="text-xs">{r.active ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
