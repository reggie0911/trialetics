'use client';

import { useState, useEffect, useCallback } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { useCTMS } from './ctms-context';
import { CTMSPageHeader } from './ctms-layout';

const LOOKUP_TABS = [
  'Protocol Phases',
  'Project Stages',
  'Therapeutic Groups',
  'Test Articles',
  'Site Groups',
  'Discontinuation Reasons',
  'Screen Failure Reasons',
  'Deviation Types',
] as const;

const PLACEHOLDER_ROWS = [
  { key: '1', value: 'Phase 1', sortOrder: 1, active: true },
  { key: '2', value: 'Phase 2', sortOrder: 2, active: true },
  { key: '3', value: 'Phase 3', sortOrder: 3, active: true },
];

export function SystemTablesPage() {
  const { companyId } = useCTMS();
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Placeholder - load lookup data when API exists
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
      <CTMSPageHeader title="System Tables" subtitle="Lookup tables and reference data">
        <Button variant="default" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Value
        </Button>
      </CTMSPageHeader>

      <Tabs defaultValue={LOOKUP_TABS[0]}>
        <TabsList className="flex flex-wrap gap-1">
          {LOOKUP_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="text-xs">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="mt-4">
          {LOOKUP_TABS.map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-0">
              <div className="rounded-md border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="bg-muted/50 text-xs font-medium">Key</TableHead>
                      <TableHead className="bg-muted/50 text-xs font-medium">Value</TableHead>
                      <TableHead className="bg-muted/50 text-xs font-medium">Sort Order</TableHead>
                      <TableHead className="bg-muted/50 text-xs font-medium">Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PLACEHOLDER_ROWS.map((row, i) => (
                      <TableRow key={i} className="hover:bg-muted/50">
                        <TableCell className="text-xs">{row.key}</TableCell>
                        <TableCell className="text-xs font-medium">{row.value}</TableCell>
                        <TableCell className="text-xs">{row.sortOrder}</TableCell>
                        <TableCell className="text-xs">{row.active ? 'Yes' : 'No'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
