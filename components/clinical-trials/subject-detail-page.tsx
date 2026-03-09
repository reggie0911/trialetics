'use client';

import { useState, useEffect, useCallback } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  User,
  FileSignature,
  Calendar,
  DollarSign,
  CreditCard,
  AlertTriangle,
  Paperclip,
} from 'lucide-react';
import { useCTMS } from './ctms-context';
import { CTMSPageHeader } from './ctms-layout';
import { getClinicalProtocol } from '@/lib/actions/clinical-protocols';
import { getClinicalSite } from '@/lib/actions/clinical-sites';

interface SubjectDetailPageProps {
  projectId: string;
  siteId: string;
  subjectId: string;
}

export function SubjectDetailPage({ projectId, siteId, subjectId }: SubjectDetailPageProps) {
  const { companyId, setSelectedProject } = useCTMS();
  const [loading, setLoading] = useState(true);
  const [protocol, setProtocol] = useState<{ id: string; title: string; protocol_number: string } | null>(null);
  const [site, setSite] = useState<{ site_number: string | null; organization_name: string | null } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [protocolResult, siteResult] = await Promise.all([
        getClinicalProtocol(projectId),
        getClinicalSite(siteId),
      ]);
      if (protocolResult.success && protocolResult.data) {
        const p = protocolResult.data;
        setProtocol({ id: p.id, title: p.title, protocol_number: p.protocol_number });
        setSelectedProject({
          id: p.id,
          name: p.title,
          protocol_number: p.protocol_number,
          status: p.status,
        });
      }
      if (siteResult.success && siteResult.data) {
        const s = siteResult.data;
        setSite({
          site_number: s.site_number,
          organization_name: (s as any).organization?.name || null,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, siteId, setSelectedProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Loading subject...
      </div>
    );
  }

  const displayTitle = `Subject ${subjectId}`;
  const siteInfo = site
    ? `${site.site_number || 'N/A'}${site.organization_name ? ` — ${site.organization_name}` : ''}`
    : 'Loading site...';

  return (
    <div className="flex flex-col gap-4">
      <CTMSPageHeader title={displayTitle} subtitle={siteInfo}>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Screened</Badge>
          {protocol && (
            <Badge variant="outline">{protocol.protocol_number}</Badge>
          )}
        </div>
      </CTMSPageHeader>

      <Tabs defaultValue="enrollment">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="enrollment" className="text-xs">Enrollment</TabsTrigger>
          <TabsTrigger value="subject" className="text-xs">Subject</TabsTrigger>
          <TabsTrigger value="consent" className="text-xs">Consent</TabsTrigger>
          <TabsTrigger value="visits" className="text-xs">Visits</TabsTrigger>
          <TabsTrigger value="budget" className="text-xs">Budget</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs">Payments</TabsTrigger>
          <TabsTrigger value="deviations" className="text-xs">Deviations</TabsTrigger>
          <TabsTrigger value="attachments" className="text-xs">Attachments</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="enrollment" className="mt-0">
            <div className="rounded-md border bg-card p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Screen Status</Label>
                    <p className="text-sm font-medium">Screened</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Screen Number</Label>
                    <p className="text-sm">{subjectId}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Screen Date</Label>
                    <p className="text-sm">—</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Enrollment Status</Label>
                    <p className="text-sm">—</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Subject Number</Label>
                    <p className="text-sm">—</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Enrollment Date</Label>
                    <p className="text-sm">—</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Randomization Status</Label>
                    <p className="text-sm">—</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Randomization Date</Label>
                    <p className="text-sm">—</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Randomization Number</Label>
                    <p className="text-sm">—</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Screen Failure / Discontinuation</Label>
                    <p className="text-sm">—</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="subject" className="mt-0">
            <div className="rounded-md border bg-card p-4">
              <div className="text-sm text-muted-foreground py-6">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Demographics from demographic_data will be displayed here.</p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="consent" className="mt-0">
            <div className="rounded-md border bg-card p-4">
              <div className="text-sm text-muted-foreground py-8 text-center">
                <FileSignature className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Consent records coming soon</p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="visits" className="mt-0">
            <div className="rounded-md border bg-card p-4">
              <div className="text-sm text-muted-foreground py-8 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Visit schedule coming soon</p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="budget" className="mt-0">
            <div className="rounded-md border bg-card p-4">
              <div className="text-sm text-muted-foreground py-8 text-center">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Subject budget info coming soon</p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="payments" className="mt-0">
            <div className="rounded-md border bg-card p-4">
              <div className="text-sm text-muted-foreground py-8 text-center">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Payment records coming soon</p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="deviations" className="mt-0">
            <div className="rounded-md border bg-card p-4">
              <div className="text-sm text-muted-foreground py-8 text-center">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Protocol deviations coming soon</p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="attachments" className="mt-0">
            <div className="rounded-md border bg-card p-4">
              <div className="text-sm text-muted-foreground py-8 text-center">
                <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>File attachments coming soon</p>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
