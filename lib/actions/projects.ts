'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import { createClinicalProtocol, updateClinicalProtocol } from '@/lib/actions/clinical-protocols';
import type { CreateClinicalProtocolData, UpdateClinicalProtocolData } from '@/lib/types/clinical-trials';

export interface CreateProjectInput {
  programName?: string;
  protocolName: string;
  protocolNumber: string;
  trialPhase: string;
  protocolDescription?: string;
  countryName?: string;
  countryRegion?: string;
  protocolStatus: string;
  plannedSites?: number;
  plannedSubjects?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
}

export type UpdateProjectInput = CreateProjectInput;

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
  created_by_id: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionResponse {
  success: boolean;
  error?: string;
  data?: AssignedProtocol[] | AssignedProtocol | unknown;
}

/** Map protocol_status from clinical_protocols to legacy display format */
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

/** Map phase from clinical_protocols to legacy display format */
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

/** Map legacy status to protocol_status */
function legacyToStatus(legacy: string): string {
  const map: Record<string, string> = {
    planning: 'planned',
    approved: 'in_progress',
    closed: 'completed',
  };
  return map[legacy] ?? 'planned';
}

/** Map legacy phase to protocol_phase */
function legacyToPhase(legacy: string): string | null {
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

function toAssignedProtocol(row: {
  id: string;
  protocol_number: string;
  title: string;
  objective: string | null;
  status: string;
  phase: string | null;
  planned_sites_count: number | null;
  planned_subjects_count: number | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  created_by_id: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
}): AssignedProtocol {
  return {
    id: row.id,
    protocol_number: row.protocol_number,
    protocol_name: row.title,
    protocol_description: row.objective,
    country_name: null,
    country_region: null,
    protocol_status: statusToLegacy(row.status),
    planned_sites: row.planned_sites_count,
    planned_subjects: row.planned_subjects_count,
    planned_start_date: row.planned_start_date,
    planned_end_date: row.planned_end_date,
    trial_phase: phaseToLegacy(row.phase),
    created_by_id: row.created_by_id,
    creator_email: row.creator_email,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Fetches protocols visible to the current user
 * - Admin users: See ALL protocols in their company
 * - Regular users: See only protocols explicitly assigned to them
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

    // Admin users see ALL company protocols
    if (profile.role === 'admin' && profile.company_id) {
      const { data: protocols, error } = await supabase
        .from('clinical_protocols')
        .select(
          `
          id,
          protocol_number,
          title,
          objective,
          status,
          phase,
          planned_sites_count,
          planned_subjects_count,
          planned_start_date,
          planned_end_date,
          created_by_id,
          creator_email,
          created_at,
          updated_at
        `
        )
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      const mapped = (protocols || []).map(toAssignedProtocol);
      return { success: true, data: mapped };
    }

    // Regular users see only assigned protocols
    const { data: assignments, error } = await supabase
      .from('user_protocol_assignments')
      .select(
        `
        protocol_id,
        clinical_protocols (
          id,
          protocol_number,
          title,
          objective,
          status,
          phase,
          planned_sites_count,
          planned_subjects_count,
          planned_start_date,
          planned_end_date,
          created_by_id,
          creator_email,
          created_at,
          updated_at
        )
      `
      )
      .eq('user_id', profile.id);

    if (error) {
      return { success: false, error: error.message };
    }

    const protocols = (assignments || [])
      .map((a: { clinical_protocols: unknown }) => a.clinical_protocols)
      .filter((p): p is Parameters<typeof toAssignedProtocol>[0] => p != null)
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

    if (!input.protocolName || !input.protocolNumber || !input.trialPhase) {
      return {
        success: false,
        error: 'Project Name, Project Number, and Trial Phase are required',
      };
    }

    if (input.plannedStartDate && input.plannedEndDate) {
      const startDate = new Date(input.plannedStartDate);
      const endDate = new Date(input.plannedEndDate);
      if (endDate < startDate) {
        return {
          success: false,
          error: 'Planned End Date must be after Planned Start Date',
        };
      }
    }

    if (input.plannedSites !== undefined && input.plannedSites < 0) {
      return { success: false, error: 'Planned Sites must be a positive number' };
    }
    if (input.plannedSubjects !== undefined && input.plannedSubjects < 0) {
      return {
        success: false,
        error: 'Planned Subjects must be a positive number',
      };
    }

    const protocolData: CreateClinicalProtocolData = {
      protocol_number: input.protocolNumber,
      title: input.protocolName,
      objective: input.protocolDescription || null,
      phase: (legacyToPhase(input.trialPhase) ?? undefined) as import('@/lib/types/clinical-trials').ProtocolPhase | undefined,
      status: legacyToStatus(input.protocolStatus) as 'planned' | 'in_progress' | 'completed',
      planned_sites_count: input.plannedSites ?? null,
      planned_subjects_count: input.plannedSubjects ?? null,
      planned_start_date: input.plannedStartDate || null,
      planned_end_date: input.plannedEndDate || null,
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

    // Assign the protocol to the current user
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

    return { success: true, data: toAssignedProtocol(newProtocol as Parameters<typeof toAssignedProtocol>[0]) };
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

    if (!input.protocolName || !input.protocolNumber || !input.trialPhase) {
      return {
        success: false,
        error: 'Project Name, Project Number, and Trial Phase are required',
      };
    }

    if (input.plannedStartDate && input.plannedEndDate) {
      const startDate = new Date(input.plannedStartDate);
      const endDate = new Date(input.plannedEndDate);
      if (endDate < startDate) {
        return {
          success: false,
          error: 'Planned End Date must be after Planned Start Date',
        };
      }
    }

    if (input.plannedSites !== undefined && input.plannedSites < 0) {
      return { success: false, error: 'Planned Sites must be a positive number' };
    }
    if (input.plannedSubjects !== undefined && input.plannedSubjects < 0) {
      return {
        success: false,
        error: 'Planned Subjects must be a positive number',
      };
    }

    const updateData: UpdateClinicalProtocolData = {
      id: protocolId,
      protocol_number: input.protocolNumber,
      title: input.protocolName,
      objective: input.protocolDescription || null,
      phase: (legacyToPhase(input.trialPhase) ?? undefined) as import('@/lib/types/clinical-trials').ProtocolPhase | undefined,
      status: legacyToStatus(input.protocolStatus) as 'planned' | 'in_progress' | 'completed',
      planned_sites_count: input.plannedSites ?? null,
      planned_subjects_count: input.plannedSubjects ?? null,
      planned_start_date: input.plannedStartDate || null,
      planned_end_date: input.plannedEndDate || null,
    };

    await updateClinicalProtocol(updateData);

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
