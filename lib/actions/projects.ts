'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import { createClinicalProtocol, updateClinicalProtocol } from '@/lib/actions/clinical-protocols';
import type { CreateClinicalProtocolData, UpdateClinicalProtocolData } from '@/lib/types/clinical-trials';

export interface CountryEntry {
  id?: string;
  countryName: string;
  countryRegion?: string;
  plannedSites?: number;
  plannedSubjects?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
}

export interface CreateProjectInput {
  programName?: string;
  protocolName: string;
  protocolNumber?: string;
  trialPhase?: string;
  protocolDescription?: string;
  protocolStatus: string;
  countries?: CountryEntry[];
}

export type UpdateProjectInput = CreateProjectInput;

export interface AssignedProtocolCountry {
  id: string;
  countryName: string;
  countryRegion: string;
  plannedSites: number | null;
  plannedSubjects: number | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
}

export interface AssignedProtocol {
  id: string;
  protocol_number: string;
  protocol_name: string;
  protocol_description: string | null;
  country_name: string | null;
  country_region: string | null;
  protocol_status: string;
  planned_sites: number | null;
  planned_subjects: number | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  trial_phase: string | null;
  regions_required: boolean;
  created_by_id: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
  countries: AssignedProtocolCountry[];
}

export interface ActionResponse {
  success: boolean;
  error?: string;
  data?: AssignedProtocol[] | AssignedProtocol | unknown;
}

function statusToLegacy(status: string): string {
  const map: Record<string, string> = {
    planned: 'planning',
    in_progress: 'approved',
    on_hold: 'planning',
    completed: 'closed',
    terminated: 'closed',
  };
  return map[status] ?? status;
}

function phaseToLegacy(phase: string | null): string | null {
  if (!phase) return null;
  const map: Record<string, string> = {
    phase_i: 'Phase I',
    phase_ii: 'Phase II',
    phase_iii: 'Phase III',
    phase_iv: 'Phase IV',
    observational: 'Observational',
    early_feasibility_study: 'Early Feasibility Study',
    first_in_human: 'First In-Human',
    pilot_stage: 'Pilot Stage',
    pivotal: 'Pivotal',
    post_market: 'Post Market',
  };
  return map[phase] ?? phase;
}

function legacyToStatus(legacy: string): string {
  const map: Record<string, string> = {
    planning: 'planned',
    approved: 'in_progress',
    closed: 'completed',
  };
  return map[legacy] ?? 'planned';
}

function legacyToPhase(legacy: string | undefined): string | null {
  if (!legacy) return null;
  const map: Record<string, string> = {
    'Phase I': 'phase_i',
    'Phase II': 'phase_ii',
    'Phase III': 'phase_iii',
    'Phase IV': 'phase_iv',
    'Pilot Stage': 'pilot_stage',
    'Pivotal': 'pivotal',
    'Post Market': 'post_market',
    'Early Feasibility Study': 'early_feasibility_study',
    'First In-Human': 'first_in_human',
    'Observational': 'observational',
  };
  return map[legacy] ?? 'observational';
}

interface ProtocolRow {
  id: string;
  protocol_number: string;
  title: string;
  objective: string | null;
  status: string;
  phase: string | null;
  regions_required: boolean;
  planned_sites_count: number | null;
  planned_subjects_count: number | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  created_by_id: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
  clinical_regions?: Array<{
    id: string;
    region_name: string;
    planned_sites_count: number | null;
    planned_subjects_count: number | null;
    planned_start_date: string | null;
    planned_end_date: string | null;
    metadata: Record<string, unknown>;
  }>;
}

function toAssignedProtocol(row: ProtocolRow): AssignedProtocol {
  const regions = row.clinical_regions || [];
  const countries: AssignedProtocolCountry[] = regions.map((r) => ({
    id: r.id,
    countryName: r.region_name,
    countryRegion: (r.metadata?.country_region as string) || '',
    plannedSites: r.planned_sites_count,
    plannedSubjects: r.planned_subjects_count,
    plannedStartDate: r.planned_start_date,
    plannedEndDate: r.planned_end_date,
  }));

  return {
    id: row.id,
    protocol_number: row.protocol_number,
    protocol_name: row.title,
    protocol_description: row.objective,
    country_name: countries[0]?.countryName || null,
    country_region: countries[0]?.countryRegion || null,
    protocol_status: statusToLegacy(row.status),
    planned_sites: row.planned_sites_count,
    planned_subjects: row.planned_subjects_count,
    planned_start_date: row.planned_start_date,
    planned_end_date: row.planned_end_date,
    trial_phase: phaseToLegacy(row.phase),
    regions_required: row.regions_required ?? false,
    created_by_id: row.created_by_id,
    creator_email: row.creator_email,
    created_at: row.created_at,
    updated_at: row.updated_at,
    countries,
  };
}

const PROTOCOL_SELECT = `
  id,
  protocol_number,
  title,
  objective,
  status,
  phase,
  regions_required,
  planned_sites_count,
  planned_subjects_count,
  planned_start_date,
  planned_end_date,
  created_by_id,
  creator_email,
  created_at,
  updated_at,
  clinical_regions (
    id,
    region_name,
    planned_sites_count,
    planned_subjects_count,
    planned_start_date,
    planned_end_date,
    metadata
  )
`;

/**
 * Fetches protocols visible to the current user
 */
export async function getUserProjects(): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id, email, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Profile not found' };
    }

    if (profile.role === 'admin' && profile.company_id) {
      const { data: protocols, error } = await supabase
        .from('clinical_protocols')
        .select(PROTOCOL_SELECT)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      const mapped = (protocols || []).map((p: unknown) => toAssignedProtocol(p as ProtocolRow));
      return { success: true, data: mapped };
    }

    const { data: assignments, error } = await supabase
      .from('user_protocol_assignments')
      .select(`protocol_id, clinical_protocols (${PROTOCOL_SELECT})`)
      .eq('user_id', profile.id);

    if (error) {
      return { success: false, error: error.message };
    }

    const protocols = (assignments || [])
      .map((a: { clinical_protocols: unknown }) => a.clinical_protocols)
      .filter((p): p is ProtocolRow => p != null)
      .map(toAssignedProtocol);

    return { success: true, data: protocols };
  } catch (error) {
    console.error('Error fetching user protocols:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function syncCountries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  protocolId: string,
  companyId: string,
  countries: CountryEntry[]
) {
  const { data: existingRegions } = await supabase
    .from('clinical_regions')
    .select('id, region_name')
    .eq('protocol_id', protocolId);

  const existing = existingRegions || [];
  const incomingNames = new Set(countries.map((c) => c.countryName));
  const existingMap = new Map(existing.map((r) => [r.region_name, r.id]));

  const toDelete = existing.filter((r) => !incomingNames.has(r.region_name));
  if (toDelete.length > 0) {
    await supabase
      .from('clinical_regions')
      .delete()
      .in('id', toDelete.map((r) => r.id));
  }

  for (const country of countries) {
    const regionId = country.id || existingMap.get(country.countryName);
    const regionData = {
      region_name: country.countryName,
      planned_sites_count: country.plannedSites ?? null,
      planned_subjects_count: country.plannedSubjects ?? null,
      planned_start_date: country.plannedStartDate || null,
      planned_end_date: country.plannedEndDate || null,
      metadata: { country_region: country.countryRegion || '' },
    };

    if (regionId) {
      await supabase
        .from('clinical_regions')
        .update(regionData)
        .eq('id', regionId);
    } else {
      await supabase
        .from('clinical_regions')
        .insert({
          ...regionData,
          protocol_id: protocolId,
          company_id: companyId,
        });
    }
  }
}

/**
 * Creates a new clinical protocol and assigns it to the current user
 */
export async function createProject(input: CreateProjectInput): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id, email')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      const { data: newProfile, error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          role: 'user',
          email: user.email,
        })
        .select('id, company_id, email')
        .single();

      if (createProfileError) {
        return {
          success: false,
          error: 'Failed to create user profile: ' + createProfileError.message,
        };
      }

      profile = newProfile;
    }

    if (!profile.company_id) {
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: `${user.email || 'User'}'s Organization`,
          settings: {},
          created_by_id: profile.id,
          creator_email: user.email,
        })
        .select('id')
        .single();

      if (companyError) {
        return {
          success: false,
          error: 'Failed to create company: ' + companyError.message,
        };
      }

      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({ company_id: newCompany.id })
        .eq('id', profile.id);

      if (updateProfileError) {
        return {
          success: false,
          error: 'Failed to assign company to profile: ' + updateProfileError.message,
        };
      }

      profile.company_id = newCompany.id;
    }

    if (!input.protocolName) {
      return {
        success: false,
        error: 'Project Name is required',
      };
    }

    const protocolNumber = input.protocolNumber?.trim() || `PROJ-${Date.now()}`;

    const countries = input.countries || [];
    const totalSites = countries.reduce((sum, c) => sum + (c.plannedSites || 0), 0) || null;
    const totalSubjects = countries.reduce((sum, c) => sum + (c.plannedSubjects || 0), 0) || null;

    const protocolData: CreateClinicalProtocolData = {
      protocol_number: protocolNumber,
      title: input.protocolName,
      objective: input.protocolDescription || null,
      phase: (legacyToPhase(input.trialPhase) ?? undefined) as import('@/lib/types/clinical-trials').ProtocolPhase | undefined,
      status: legacyToStatus(input.protocolStatus) as 'planned' | 'in_progress' | 'completed',
      planned_sites_count: totalSites,
      planned_subjects_count: totalSubjects,
      planned_start_date: null,
      planned_end_date: null,
    };

    const result = await createClinicalProtocol(
      profile.company_id,
      profile.id,
      profile.email || user.email,
      protocolData
    );

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to create protocol',
      };
    }

    const newProtocol = result.data;

    if (countries.length > 0) {
      await syncCountries(supabase, newProtocol.id, profile.company_id, countries);
    }

    const { error: assignmentError } = await supabase
      .from('user_protocol_assignments')
      .insert({
        user_id: profile.id,
        protocol_id: newProtocol.id,
        created_by_id: profile.id,
        creator_email: profile.email || user.email,
      });

    if (assignmentError) {
      console.error('Failed to assign protocol to user:', assignmentError);
      return {
        success: false,
        error: 'Protocol created but failed to assign to user',
      };
    }

    revalidatePath('/protected');

    return { success: true };
  } catch (error) {
    console.error('Error creating project:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Updates an existing clinical protocol
 */
export async function updateProject(
  protocolId: string,
  input: UpdateProjectInput
): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!input.protocolName) {
      return {
        success: false,
        error: 'Project Name is required',
      };
    }

    let protocolNumber = input.protocolNumber?.trim();
    if (!protocolNumber) {
      const { data: existing } = await supabase
        .from('clinical_protocols')
        .select('protocol_number, company_id')
        .eq('id', protocolId)
        .single();
      protocolNumber = existing?.protocol_number ?? `PROJ-${Date.now()}`;
    }

    const { data: proto } = await supabase
      .from('clinical_protocols')
      .select('company_id')
      .eq('id', protocolId)
      .single();

    const countries = input.countries || [];
    const totalSites = countries.reduce((sum, c) => sum + (c.plannedSites || 0), 0) || null;
    const totalSubjects = countries.reduce((sum, c) => sum + (c.plannedSubjects || 0), 0) || null;

    const updateData: UpdateClinicalProtocolData = {
      id: protocolId,
      protocol_number: protocolNumber,
      title: input.protocolName,
      objective: input.protocolDescription || null,
      phase: (legacyToPhase(input.trialPhase) ?? undefined) as import('@/lib/types/clinical-trials').ProtocolPhase | undefined,
      status: legacyToStatus(input.protocolStatus) as 'planned' | 'in_progress' | 'completed',
      planned_sites_count: totalSites,
      planned_subjects_count: totalSubjects,
      planned_start_date: null,
      planned_end_date: null,
    };

    await updateClinicalProtocol(updateData);

    if (proto?.company_id) {
      await syncCountries(supabase, protocolId, proto.company_id, countries);
    }

    revalidatePath('/protected');

    return { success: true };
  } catch (error) {
    console.error('Error updating project:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
