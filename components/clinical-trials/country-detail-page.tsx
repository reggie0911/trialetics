'use client';

import { useState, useEffect, useCallback } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { getClinicalProtocol } from '@/lib/actions/clinical-protocols';
import { getClinicalRegion } from '@/lib/actions/clinical-regions';
import { useCTMS } from './ctms-context';
import { CTMSPageHeader } from './ctms-layout';
import type { ClinicalRegionWithRelations, ClinicalProtocolWithRelations } from '@/lib/types/clinical-trials';
import {
  Globe,
  UserCheck,
  ClipboardList,
  FileText,
  BarChart3,
} from 'lucide-react';

interface CountryDetailPageProps {
  projectId: string;
  countryId: string;
}

export function CountryDetailPage({ projectId, countryId }: CountryDetailPageProps) {
  const { companyId, setSelectedProject, setSelectedCountry } = useCTMS();
  const [protocol, setProtocol] = useState<ClinicalProtocolWithRelations | null>(null);
  const [region, setRegion] = useState<ClinicalRegionWithRelations | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [protocolResult, regionResult] = await Promise.all([
        getClinicalProtocol(projectId),
        getClinicalRegion(countryId),
      ]);

      if (protocolResult.success && protocolResult.data) {
        const p = protocolResult.data;
        setProtocol(p);
        setSelectedProject({
          id: p.id,
          name: p.title,
          protocol_number: p.protocol_number,
          status: p.status,
        });
      }
      if (regionResult.success && regionResult.data) {
        const r = regionResult.data;
        setRegion(r);
        setSelectedCountry({ id: r.id, name: r.region_name });
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, countryId, setSelectedProject, setSelectedCountry]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Loading country...
      </div>
    );
  }

  if (!region || region.protocol_id !== projectId) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Country not found
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CTMSPageHeader title={region.region_name} subtitle={`${protocol?.protocol_number} - ${protocol?.title}`} />

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details" className="text-xs">
            <Globe className="h-3.5 w-3.5 mr-1" />
            Details
          </TabsTrigger>
          <TabsTrigger value="key-roles" className="text-xs">
            <UserCheck className="h-3.5 w-3.5 mr-1" />
            Key Roles
          </TabsTrigger>
          <TabsTrigger value="milestones" className="text-xs">
            <ClipboardList className="h-3.5 w-3.5 mr-1" />
            Milestones
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs">
            <FileText className="h-3.5 w-3.5 mr-1" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="statistics" className="text-xs">
            <BarChart3 className="h-3.5 w-3.5 mr-1" />
            Statistics
          </TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="details" className="mt-0">
            <div className="rounded-md border bg-card p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Country Name</Label>
                    <p className="text-sm font-medium">{region.region_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Planned Sites</Label>
                    <p className="text-sm">{region.planned_sites_count ?? '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Planned Subjects</Label>
                    <p className="text-sm">{region.planned_subjects_count ?? '-'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Region Category</Label>
                    <p className="text-sm">
                      {(region.metadata as { country_region?: string })?.country_region || '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <p className="text-sm">{region.planned_start_date || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <p className="text-sm">{region.planned_end_date || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Currency</Label>
                    <p className="text-sm">{region.currency_code || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="key-roles" className="mt-0">
            <div className="rounded-md border bg-card p-4">
              <div className="text-sm text-muted-foreground py-8 text-center">
                <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Country key roles will be loaded from team assignments.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="milestones" className="mt-0">
            <div className="rounded-md border bg-card p-4">
              <div className="text-sm text-muted-foreground py-8 text-center">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Country milestones coming soon.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <div className="rounded-md border bg-card p-4">
              <div className="text-sm text-muted-foreground py-8 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Country documents coming soon.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="statistics" className="mt-0">
            <div className="rounded-md border bg-card p-4">
              <div className="text-sm text-muted-foreground py-8 text-center">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Enrollment statistics coming soon.</p>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
