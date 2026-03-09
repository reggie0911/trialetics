'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  ClinicalProgram,
  ClinicalProgramWithRelations,
  CreateClinicalProgramData,
  UpdateClinicalProgramData,
  ClinicalProgramFilters,
} from '@/lib/types/clinical-trials';

// =============================================
// Response Type
// =============================================

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================
// Get Clinical Programs with Filtering and Pagination
// =============================================

export async function getClinicalPrograms(
  companyId: string,
  filters: ClinicalProgramFilters = {}
): Promise<ActionResponse<{ programs: ClinicalProgramWithRelations[]; total: number }>> {
  try {
    const supabase = await createClient();
    const {
      search,
      status = 'all',
      page = 1,
      pageSize = 25,
    } = filters;

    let query = supabase
      .from('clinical_programs')
      .select('*, clinical_protocols(count), program_manager:contacts!clinical_programs_program_manager_contact_id_fkey(id, first_name, last_name, email)', { count: 'exact' })
      .eq('company_id', companyId);

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Get total count
    const { count: total } = await supabase
      .from('clinical_programs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Order by created date
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching clinical programs:', error);
      return { success: false, error: error.message };
    }

    // Transform data to include protocols_count
    const programs = (data || []).map((program: any) => ({
      ...program,
      protocols_count: program.clinical_protocols?.[0]?.count || 0,
      clinical_protocols: undefined,
      program_manager: program.program_manager || null,
    }));

    return {
      success: true,
      data: { programs, total: total || 0 },
    };
  } catch (error) {
    console.error('Error in getClinicalPrograms:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch clinical programs',
    };
  }
}

// =============================================
// Get All Clinical Programs (for dropdowns)
// =============================================

export async function getAllClinicalPrograms(
  companyId: string
): Promise<ActionResponse<ClinicalProgram[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('clinical_programs')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching all clinical programs:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getAllClinicalPrograms:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch clinical programs',
    };
  }
}

// =============================================
// Get Single Clinical Program by ID
// =============================================

export async function getClinicalProgram(
  programId: string
): Promise<ActionResponse<ClinicalProgramWithRelations>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('clinical_programs')
      .select(`
        *,
        clinical_protocols (*)
      `)
      .eq('id', programId)
      .single();

    if (error) {
      console.error('Error fetching clinical program:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Clinical program not found' };
    }

    // Transform data
    const program: ClinicalProgramWithRelations = {
      ...data,
      protocols: data.clinical_protocols || [],
      protocols_count: data.clinical_protocols?.length || 0,
    };

    return { success: true, data: program };
  } catch (error) {
    console.error('Error in getClinicalProgram:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch clinical program',
    };
  }
}

// =============================================
// Create Clinical Program
// =============================================

export async function createClinicalProgram(
  companyId: string,
  profileId: string,
  email: string,
  data: CreateClinicalProgramData
): Promise<ActionResponse<ClinicalProgram>> {
  try {
    const supabase = await createClient();

    const programData = {
      company_id: companyId,
      created_by_id: profileId,
      creator_email: email,
      ...data,
    };

    const { data: newProgram, error } = await supabase
      .from('clinical_programs')
      .insert(programData)
      .select()
      .single();

    if (error) {
      console.error('Error creating clinical program:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/clinical-trials');

    return { success: true, data: newProgram };
  } catch (error) {
    console.error('Error in createClinicalProgram:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create clinical program',
    };
  }
}

// =============================================
// Update Clinical Program
// =============================================

export async function updateClinicalProgram(
  data: UpdateClinicalProgramData
): Promise<ActionResponse<ClinicalProgram>> {
  try {
    const supabase = await createClient();
    const { id, ...updateData } = data;

    const { data: updatedProgram, error } = await supabase
      .from('clinical_programs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating clinical program:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/clinical-trials');
    revalidatePath(`/protected/clinical-trials/program/${id}`);

    return { success: true, data: updatedProgram };
  } catch (error) {
    console.error('Error in updateClinicalProgram:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update clinical program',
    };
  }
}

// =============================================
// Delete Clinical Program
// =============================================

export async function deleteClinicalProgram(
  programId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('clinical_programs')
      .delete()
      .eq('id', programId);

    if (error) {
      console.error('Error deleting clinical program:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/clinical-trials');

    return { success: true, data: null };
  } catch (error) {
    console.error('Error in deleteClinicalProgram:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete clinical program',
    };
  }
}
