'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  getTMFStructure,
  getArtifactsByZone,
  getProtocolsForETMF,
  getTMFCompleteness,
  runCompletenessCheck,
  updateArtifact,
} from '@/lib/actions/etmf';
import type { TMFZone, TMFSection, TMFArtifact } from '@/lib/types/etmf';
import { TMF_ARTIFACT_STATUS_LABELS, type TMFArtifactStatus } from '@/lib/types/etmf';

const STATUS_COLORS: Record<TMFArtifactStatus, string> = {
  not_started: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  complete: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  not_applicable: 'bg-gray-50 text-gray-400 dark:bg-gray-800/50 dark:text-gray-500',
};

interface EtmfClientProps {
  companyId: string;
}

export function EtmfClient({ companyId }: EtmfClientProps) {
  const [zones, setZones] = useState<TMFZone[]>([]);
  const [protocols, setProtocols] = useState<{ id: string; protocol_number: string | null; title: string }[]>([]);
  const [protocolId, setProtocolId] = useState<string>('');
  const [artifacts, setArtifacts] = useState<TMFArtifact[]>([]);
  const [completeness, setCompleteness] = useState<{
    total: number;
    completed: number;
    not_applicable: number;
    percentage: number;
    zone_breakdown: Record<string, { total: number; complete: number; pct: number }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedZones, setExpandedZones] = useState<string[]>([]);
  const { toast } = useToast();

  const loadStructure = useCallback(async () => {
    const res = await getTMFStructure(companyId);
    if (res.success && res.data) setZones(res.data);
  }, [companyId]);

  const loadProtocols = useCallback(async () => {
    const res = await getProtocolsForETMF(companyId);
    if (res.success && res.data) setProtocols(res.data);
  }, [companyId]);

  const loadArtifacts = useCallback(async () => {
    if (!protocolId) {
      setArtifacts([]);
      return;
    }
    const res = await getArtifactsByZone(companyId, protocolId);
    if (res.success && res.data) setArtifacts(res.data);
  }, [companyId, protocolId]);

  const loadCompleteness = useCallback(async () => {
    if (!protocolId) {
      setCompleteness(null);
      return;
    }
    const res = await getTMFCompleteness(companyId, protocolId);
    if (res.success && res.data) setCompleteness(res.data);
  }, [companyId, protocolId]);

  const load = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadStructure(), loadProtocols()]);
    setIsLoading(false);
  }, [loadStructure, loadProtocols]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (protocolId) {
      loadArtifacts();
      loadCompleteness();
    } else {
      setArtifacts([]);
      setCompleteness(null);
    }
  }, [protocolId, loadArtifacts, loadCompleteness]);

  const handleStatusChange = async (artifactId: string, status: TMFArtifactStatus) => {
    const res = await updateArtifact(artifactId, {
      status,
      completion_date: status === 'complete' ? new Date().toISOString().split('T')[0] : null,
    });
    if (res.success) {
      toast({ title: 'Status updated', variant: 'default' });
      loadArtifacts();
      loadCompleteness();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  const handleRunCompletenessCheck = async () => {
    if (!protocolId) return;
    const res = await runCompletenessCheck(protocolId);
    if (res.success) {
      toast({ title: 'Completeness check recorded', variant: 'default' });
      loadCompleteness();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  const getArtifactsForSection = (sectionId: string) =>
    artifacts.filter((a) => a.section_id === sectionId);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-sm text-muted-foreground">
        Loading eTMF structure...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Label htmlFor="protocol" className="text-sm font-medium whitespace-nowrap">
            Protocol
          </Label>
          <Select value={protocolId} onValueChange={setProtocolId}>
            <SelectTrigger id="protocol" className="w-[280px]">
              <SelectValue placeholder="Select a protocol" />
            </SelectTrigger>
            <SelectContent>
              {protocols.length === 0 ? (
                <SelectItem value="_none" disabled>
                  No protocols
                </SelectItem>
              ) : (
                protocols.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.protocol_number ? `${p.protocol_number} – ` : ''}{p.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        {protocolId && completeness && (
          <div className="flex items-center gap-4">
            <div className="rounded-lg border bg-white px-4 py-2">
              <span className="text-xs text-muted-foreground">Completeness</span>
              <p className="text-lg font-semibold text-green-600">
                {completeness.percentage.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {completeness.completed} / {completeness.total - completeness.not_applicable}{' '}
                applicable
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleRunCompletenessCheck}>
              Record Check
            </Button>
          </div>
        )}
      </div>

      {!protocolId ? (
        <div className="rounded-lg border bg-white p-8 text-center text-sm text-muted-foreground">
          Select a protocol to view eTMF artifacts and completeness.
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">DIA TMF Reference Model</CardTitle>
            <p className="text-xs text-muted-foreground">
              Zones and sections with artifact status
            </p>
          </CardHeader>
          <CardContent>
            <Accordion
              type="multiple"
              value={expandedZones}
              onValueChange={setExpandedZones}
              className="w-full"
            >
              {zones.map((zone) => {
                const zoneStats = completeness?.zone_breakdown?.[zone.id];
                const zonePct = zoneStats
                  ? zoneStats.total > 0
                    ? ((zoneStats.complete / zoneStats.total) * 100).toFixed(0)
                    : '0'
                  : '—';

                return (
                  <AccordionItem key={zone.id} value={zone.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          Zone {zone.zone_number}: {zone.name}
                        </span>
                        {zoneStats && (
                          <Badge variant="secondary" className="text-xs">
                            {zonePct}% complete
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pl-2">
                        {(!zone.sections || zone.sections.length === 0) ? (
                          <p className="text-xs text-muted-foreground py-2">
                            No sections defined
                          </p>
                        ) : (
                          zone.sections.map((section) => {
                            const sectionArtifacts = getArtifactsForSection(section.id);
                            return (
                              <div key={section.id} className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">
                                  {section.section_number
                                    ? `${section.section_number} – `
                                    : ''}
                                  {section.name}
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                  {sectionArtifacts.length === 0 ? (
                                    <p className="text-xs text-muted-foreground col-span-full py-2">
                                      No artifacts
                                    </p>
                                  ) : (
                                    sectionArtifacts.map((artifact) => (
                                      <ArtifactCard
                                        key={artifact.id}
                                        artifact={artifact}
                                        onStatusChange={handleStatusChange}
                                      />
                                    ))
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ArtifactCard({
  artifact,
  onStatusChange,
}: {
  artifact: TMFArtifact;
  onStatusChange: (id: string, status: TMFArtifactStatus) => void;
}) {
  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium line-clamp-2">
            {artifact.name}
          </CardTitle>
          <Select
            value={artifact.status}
            onValueChange={(v) => onStatusChange(artifact.id, v as TMFArtifactStatus)}
          >
            <SelectTrigger className="h-7 w-[110px] shrink-0">
              <Badge
                variant="secondary"
                className={STATUS_COLORS[artifact.status]}
              >
                {TMF_ARTIFACT_STATUS_LABELS[artifact.status]}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              {(
                Object.entries(TMF_ARTIFACT_STATUS_LABELS) as [TMFArtifactStatus, string][]
              ).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-0 text-xs text-muted-foreground space-y-1">
        {artifact.responsible_role && (
          <p>Role: {artifact.responsible_role}</p>
        )}
        {artifact.target_date && (
          <p>Target: {artifact.target_date}</p>
        )}
        {artifact.completion_date && (
          <p>Completed: {artifact.completion_date}</p>
        )}
        {artifact.files && artifact.files.length > 0 && (
          <p>{artifact.files.length} file(s) attached</p>
        )}
      </CardContent>
    </Card>
  );
}
