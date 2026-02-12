'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  CreateSubjectData,
  UpdateSubjectData,
  SubjectWithRelations,
  SubjectFilters,
} from '@/lib/types/clinical-trials';

// =============================================
// Get Subjects
// =============================================

export async function getSubjects(
  companyId: string,
  filters: SubjectFilters = {}
) {
  const supabase = await createClient();
  const { search, site_id, status, enrollment_date_from, enrollment_date_to, page = 1, pageSize = 50 } = filters;

  try {
    let query = supabase
      .from('subjects')
      .select(
        `
        *,
        site:site_id (
          id,
          site_number,
          organization:organization_id (
            id,
            name
          )
        )
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId);

    if (search) {
      query = query.or(`screening_number.ilike.%${search}%,subject_number.ilike.%${search}%`);
    }

    if (site_id) {
      query = query.eq('site_id', site_id);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (enrollment_date_from) {
      query = query.gte('enrollment_date', enrollment_date_from);
    }

    if (enrollment_date_to) {
      query = query.lte('enrollment_date', enrollment_date_to);
    }

    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching subjects:', error);
      return {
        success: false,
        error: 'Failed to fetch subjects',
        data: null,
      };
    }

    return {
      success: true,
      data: {
        subjects: data || [],
        total: count || 0,
        page,
        pageSize,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error in getSubjects:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Get Single Subject
// =============================================

export async function getSubject(companyId: string, id: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('subjects')
      .select(
        `
        *,
        site:site_id (
          id,
          site_number,
          status,
          protocol_id,
          organization:organization_id (
            id,
            name
          )
        )
      `
      )
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) {
      console.error('Error fetching subject:', error);
      return {
        success: false,
        error: 'Failed to fetch subject',
        data: null,
      };
    }

    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error in getSubject:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Create Subject
// =============================================

export async function createSubject(
  companyId: string,
  profileId: string,
  email: string,
  data: CreateSubjectData
) {
  const supabase = await createClient();

  try {
    const {
      site_id,
      screening_number,
      subject_number,
      status,
      enrollment_date,
      screening_date,
      completion_date,
      termination_date,
      termination_reason,
      screen_failure_reason,
      demographic_data,
      metadata,
    } = data;

    // Check for duplicate subject_number at this site
    if (subject_number) {
      const { data: existing } = await supabase
        .from('subjects')
        .select('id')
        .eq('site_id', site_id)
        .eq('subject_number', subject_number)
        .eq('company_id', companyId)
        .single();

      if (existing) {
        return {
          success: false,
          error: 'A subject with this number already exists at this site',
          data: null,
        };
      }
    }

    const insertData = {
      company_id: companyId,
      site_id,
      screening_number: screening_number || null,
      subject_number: subject_number || null,
      status: status || 'screening',
      enrollment_date: enrollment_date || null,
      screening_date: screening_date || null,
      completion_date: completion_date || null,
      termination_date: termination_date || null,
      termination_reason: termination_reason || null,
      screen_failure_reason: screen_failure_reason || null,
      demographic_data: demographic_data || {},
      metadata: metadata || {},
      created_by_id: profileId,
      creator_email: email,
    };

    const { data: subject, error } = await supabase
      .from('subjects')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating subject:', error);
      return {
        success: false,
        error: 'Failed to create subject',
        data: null,
      };
    }

    // Update site milestone counts
    await updateSiteMilestones(companyId, site_id);

    revalidatePath('/protected/clinical-trials');
    return {
      success: true,
      data: subject,
      error: null,
    };
  } catch (error) {
    console.error('Error in createSubject:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Update Subject
// =============================================

export async function updateSubject(
  companyId: string,
  updateData: UpdateSubjectData
) {
  const supabase = await createClient();

  try {
    const { id, subject_number, site_id, ...rest } = updateData;

    // If updating subject_number, check for duplicates
    if (subject_number && site_id) {
      const { data: existing } = await supabase
        .from('subjects')
        .select('id')
        .eq('site_id', site_id)
        .eq('subject_number', subject_number)
        .eq('company_id', companyId)
        .neq('id', id)
        .single();

      if (existing) {
        return {
          success: false,
          error: 'A subject with this number already exists at this site',
          data: null,
        };
      }
    }

    const updates: Record<string, any> = { ...rest, updated_at: new Date().toISOString() };
    if (subject_number !== undefined) updates.subject_number = subject_number;

    const { data, error } = await supabase
      .from('subjects')
      .update(updates)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating subject:', error);
      return {
        success: false,
        error: 'Failed to update subject',
        data: null,
      };
    }

    // Get site_id from the subject if not provided
    const finalSiteId = site_id || data.site_id;
    if (finalSiteId) {
      await updateSiteMilestones(companyId, finalSiteId);
    }

    revalidatePath('/protected/clinical-trials');
    revalidatePath('/protected/source-data-verification');
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error in updateSubject:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Delete Subject
// =============================================

export async function deleteSubject(companyId: string, id: string) {
  const supabase = await createClient();

  try {
    // Get subject to know which site to update
    const { data: subject } = await supabase
      .from('subjects')
      .select('site_id')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error deleting subject:', error);
      return {
        success: false,
        error: 'Failed to delete subject',
      };
    }

    // Update site milestones
    if (subject?.site_id) {
      await updateSiteMilestones(companyId, subject.site_id);
    }

    revalidatePath('/protected/clinical-trials');
    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error('Error in deleteSubject:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// =============================================
// Helper: Update Site Milestones
// =============================================

async function updateSiteMilestones(companyId: string, siteId: string) {
  const supabase = await createClient();

  try {
    // Get all subjects for this site
    const { data: subjects } = await supabase
      .from('subjects')
      .select('*')
      .eq('site_id', siteId)
      .eq('company_id', companyId);

    if (!subjects) return;

    // Calculate counts
    const enrolled_subject_count = subjects.filter((s) => s.status === 'enrolled' || s.status === 'completed').length;
    const screen_failure_count = subjects.filter((s) => s.status === 'screen_failure').length;
    const completed_subject_count = subjects.filter((s) => s.status === 'completed').length;
    const early_terminated_count = subjects.filter((s) => s.status === 'terminated').length;

    // Calculate dates
    const enrolledSubjects = subjects.filter((s) => s.enrollment_date).sort((a, b) => 
      new Date(a.enrollment_date!).getTime() - new Date(b.enrollment_date!).getTime()
    );

    const first_subject_enrolled_date = enrolledSubjects.length > 0 ? enrolledSubjects[0].enrollment_date : null;
    const last_subject_enrolled_date = enrolledSubjects.length > 0 ? enrolledSubjects[enrolledSubjects.length - 1].enrollment_date : null;

    // Update site
    await supabase
      .from('clinical_sites')
      .update({
        enrolled_subject_count,
        screen_failure_count,
        completed_subject_count,
        early_terminated_count,
        first_subject_enrolled_date,
        last_subject_enrolled_date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', siteId)
      .eq('company_id', companyId);
  } catch (error) {
    console.error('Error updating site milestones:', error);
  }
}
