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

const CONFIG_TABS = [
  'Application',
  'Site',
  'Enrollment',
  'Finance',
  'Security',
  'Global Contacts',
  'Protocol Deviation',
  'Data Import',
] as const;

const PLACEHOLDER_VARS = [
  { name: 'APP_NAME', value: 'ClinPlus CTMS', description: 'Application display name' },
  { name: 'LOG_LEVEL', value: 'info', description: 'Logging verbosity' },
];

export function ConfigurationPage() {
  const { companyId } = useCTMS();
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Placeholder - load config when API exists
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
      <CTMSPageHeader title="Configuration" subtitle="System configuration variables">
        <Button variant="default" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Variable
        </Button>
      </CTMSPageHeader>

      <Tabs defaultValue={CONFIG_TABS[0]}>
        <TabsList className="flex flex-wrap gap-1">
          {CONFIG_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="text-xs">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="mt-4">
          {CONFIG_TABS.map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-0">
              <div className="rounded-md border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="bg-muted/50 text-xs font-medium">Variable Name</TableHead>
                      <TableHead className="bg-muted/50 text-xs font-medium">Value</TableHead>
                      <TableHead className="bg-muted/50 text-xs font-medium">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PLACEHOLDER_VARS.map((v, i) => (
                      <TableRow key={i} className="hover:bg-muted/50">
                        <TableCell className="text-xs font-medium">{v.name}</TableCell>
                        <TableCell className="text-xs">{v.value}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{v.description}</TableCell>
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
