'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import { Tables } from '@/lib/types/database.types';

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

export interface ActionResponse {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Fetches projects visible to the current user
 * - Admin users: See ALL projects in their company
 * - Regular users: See only projects explicitly assigned to them
 */
export async function getUserProjects(): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user's profile to access the profile id, role, and company
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id, email, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Profile not found' };
    }

    // Admin users see ALL company projects
    if (profile.role === 'admin' && profile.company_id) {
      const { data: allProjects, error: projectsError } = await supabase
        .from('projects')
        .select(
          `
          id,
          protocol_number,
          protocol_name,
          protocol_description,
          country_name,
          country_region,
          protocol_status,
          planned_sites,
          planned_subjects,
          planned_start_date,
          planned_end_date,
          trial_phase,
          created_by_id,
          creator_email,
          created_at,
          updated_at
        `
        )
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (projectsError) {
        return { success: false, error: projectsError.message };
      }

      return { success: true, data: allProjects || [] };
    }

    // Regular users see only assigned projects
    const { data: userProjects, error: projectsError } = await supabase
      .from('user_projects')
      .select(
        `
        project_id,
        projects (
          id,
          protocol_number,
          protocol_name,
          protocol_description,
          country_name,
          country_region,
          protocol_status,
          planned_sites,
          planned_subjects,
          planned_start_date,
          planned_end_date,
          trial_phase,
          created_by_id,
          creator_email,
          created_at,
          updated_at
        )
      `
      )
      .eq('user_id', profile.id);

    if (projectsError) {
      return { success: false, error: projectsError.message };
    }

    // Extract and flatten the projects
    const projects = userProjects?.map((up: any) => up.projects) || [];

    return { success: true, data: projects };
  } catch (error) {
    console.error('Error fetching user projects:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Creates a new project and assigns it to the current user
 */
export async function createProject(
  input: CreateProjectInput
): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user's profile and company_id
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id, email')
      .eq('user_id', user.id)
      .single();

    // If profile doesn't exist, create it
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

    // If user doesn't have a company, create a default one
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

      // Update profile with new company_id
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

    // Validate required fields
    if (!input.protocolName || !input.protocolNumber || !input.trialPhase) {
      return {
        success: false,
        error: 'Project Name, Project Number, and Trial Phase are required',
      };
    }

    // Validate date logic if both dates are provided
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

    // Validate positive integers for sites and subjects
    if (input.plannedSites !== undefined && input.plannedSites < 0) {
      return { success: false, error: 'Planned Sites must be a positive number' };
    }
    if (input.plannedSubjects !== undefined && input.plannedSubjects < 0) {
      return {
        success: false,
        error: 'Planned Subjects must be a positive number',
      };
    }

    // Insert the new project with creator tracking
    const { data: newProject, error: insertError } = await supabase
      .from('projects')
      .insert({
        company_id: profile.company_id,
        protocol_number: input.protocolNumber,
        protocol_name: input.protocolName,
        protocol_description: input.protocolDescription || null,
        country_name: input.countryName || null,
        country_region: input.countryRegion || null,
        protocol_status: input.protocolStatus,
        planned_sites: input.plannedSites || null,
        planned_subjects: input.plannedSubjects || null,
        planned_start_date: input.plannedStartDate || null,
        planned_end_date: input.plannedEndDate || null,
        trial_phase: input.trialPhase,
        created_by_id: profile.id,
        creator_email: profile.email || user.email,
      })
      .select()
      .single();

    if (insertError) {
      // Check for unique constraint violation
      if (insertError.code === '23505') {
        return {
          success: false,
          error: 'A project with this number already exists for your company',
        };
      }
      return { success: false, error: insertError.message };
    }

    // Assign the project to the current user with creator tracking
    const { error: assignmentError } = await supabase
      .from('user_projects')
      .insert({
        user_id: profile.id,
        project_id: newProject.id,
        created_by_id: profile.id,
        creator_email: profile.email || user.email,
      });

    if (assignmentError) {
      // If assignment fails, we should ideally rollback, but for now just log
      console.error('Failed to assign project to user:', assignmentError);
      return {
        success: false,
        error: 'Project created but failed to assign to user',
      };
    }

    // Revalidate the protected page to show the new project
    revalidatePath('/protected');

    return { success: true, data: newProject };
  } catch (error) {
    console.error('Error creating project:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
