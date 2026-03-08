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
import { Plus, Globe } from 'lucide-react';
import { useCTMS } from './ctms-context';
import { CTMSPageHeader } from './ctms-layout';

const countries: {
  name: string;
  code: string;
  region: string;
  phoneCode: string;
  active: boolean;
}[] = [];

export function SystemCountriesPage() {
  const { companyId } = useCTMS();
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Placeholder - load countries when API exists
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
      <CTMSPageHeader title="System Countries" subtitle="Manage country definitions">
        <Button variant="default" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Country
        </Button>
      </CTMSPageHeader>

      <div className="rounded-md border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-medium flex items-center gap-2">Countries</h3>
        </div>
        <div className="px-4 pb-4">
          {countries.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <Globe className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No countries found</EmptyTitle>
                <EmptyDescription>
                  Add countries to manage regional data.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50 text-xs font-medium">Country Name</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Country Code</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Region</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Phone Code</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countries.map((c, i) => (
                  <TableRow key={i} className="hover:bg-muted/50">
                    <TableCell className="text-xs font-medium">{c.name}</TableCell>
                    <TableCell className="text-xs">{c.code}</TableCell>
                    <TableCell className="text-xs">{c.region}</TableCell>
                    <TableCell className="text-xs">{c.phoneCode}</TableCell>
                    <TableCell className="text-xs">{c.active ? 'Yes' : 'No'}</TableCell>
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
