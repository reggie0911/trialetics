'use server';

import { createClient } from '@/lib/server';

export interface OrganizationClinicalSite {
  id: string;
  site_number: string | null;
  status: string;
  protocol_id: string;
  protocol: { protocol_number: string; title: string };
  region: { region_name: string } | null;
}

export interface OrganizationProtocolAssignment {
  id: string;
  protocol_id: string;
  role: string;
  account_type: string | null;
  is_central: boolean;
  protocol: { protocol_number: string; title: string };
}

export interface OrganizationClinicalTrials {
  clinical_sites: OrganizationClinicalSite[];
  protocol_assignments: OrganizationProtocolAssignment[];
}

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get all clinical trial associations for an organization:
 * - clinical_sites: sites where this org participates (as organization_id)
 * - protocol_assignments: from organization_protocols (all roles including former protocol_accounts)
 */
export async function getOrganizationClinicalTrials(
  organizationId: string
): Promise<ActionResponse<OrganizationClinicalTrials>> {
  try {
    const supabase = await createClient();

    const [sitesResult, assignmentsResult] = await Promise.all([
      supabase
        .from('clinical_sites')
        .select(`
          id,
          site_number,
          status,
          protocol_id,
          protocol:clinical_protocols(protocol_number, title),
          region:clinical_regions(region_name)
        `)
        .eq('organization_id', organizationId)
        .order('protocol_id'),
      supabase
        .from('organization_protocols')
        .select(`
          id,
          protocol_id,
          role,
          account_type,
          is_central,
          protocol:clinical_protocols(protocol_number, title)
        `)
        .eq('organization_id', organizationId)
        .order('protocol_id'),
    ]);

    if (sitesResult.error) return { success: false, error: sitesResult.error.message };
    if (assignmentsResult.error) return { success: false, error: assignmentsResult.error.message };

    const normalizeProtocol = (p: unknown): { protocol_number: string; title: string } => {
      if (Array.isArray(p)) return (p[0] as { protocol_number: string; title: string }) ?? { protocol_number: '', title: '' };
      return (p as { protocol_number: string; title: string }) ?? { protocol_number: '', title: '' };
    };
    const normalizeRegion = (r: unknown): { region_name: string } | null => {
      if (!r) return null;
      if (Array.isArray(r)) return (r[0] as { region_name: string }) ?? null;
      return r as { region_name: string };
    };

    const clinical_sites: OrganizationClinicalSite[] = (sitesResult.data || []).map((s: any) => ({
      id: s.id,
      site_number: s.site_number,
      status: s.status,
      protocol_id: s.protocol_id,
      protocol: normalizeProtocol(s.protocol),
      region: normalizeRegion(s.region),
    }));

    const protocol_assignments: OrganizationProtocolAssignment[] = (assignmentsResult.data || []).map((a: any) => ({
      id: a.id,
      protocol_id: a.protocol_id,
      role: a.role,
      account_type: a.account_type ?? null,
      is_central: a.is_central ?? false,
      protocol: normalizeProtocol(a.protocol),
    }));

    return {
      success: true,
      data: {
        clinical_sites,
        protocol_assignments,
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
