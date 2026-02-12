'use client';

import Link from 'next/link';
import { Building2, ChevronRight, Banknote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SiteItem {
  id: string;
  site_number: string | null;
  protocol: { protocol_number: string } | { protocol_number: string }[];
  organization: { name: string } | { name: string }[] | null;
  pending_count: number;
}

interface PaymentSitesTabProps {
  sites: SiteItem[];
  onRefresh: () => void;
  companyId: string;
}

function getOrgName(org: { name: string } | { name: string }[] | null): string {
  if (!org) return 'Unknown';
  const o = Array.isArray(org) ? org[0] : org;
  return o?.name ?? 'Unknown';
}

function getProtocolNumber(proto: { protocol_number: string } | { protocol_number: string }[] | null): string {
  if (!proto) return 'N/A';
  const p = Array.isArray(proto) ? proto[0] : proto;
  return p?.protocol_number ?? 'N/A';
}

export function PaymentSitesTab({ sites, onRefresh, companyId }: PaymentSitesTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Sites with Payment Data</CardTitle>
        <p className="text-xs text-muted-foreground">
          Click a site to manage payment activities, exceptions, and generate payment records.
        </p>
      </CardHeader>
      <CardContent>
        {sites.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">
            No clinical sites found. Add sites in Clinical Trials Management first.
          </p>
        ) : (
          <div className="space-y-2">
            {sites.map((site) => (
              <Link
                key={site.id}
                href={`/protected/clinical-payments/sites/${site.id}`}
                className="block"
                prefetch={false}
              >
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">
                        Site {site.site_number ?? 'N/A'} - {getOrgName(site.organization)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Protocol: {getProtocolNumber(site.protocol)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {site.pending_count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Banknote className="h-3 w-3 mr-1" />
                        {site.pending_count} pending
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
