'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type {
  SubjectVisit,
  SubjectVisitWithRelations,
  SubjectVisitFilters,
  CreateSubjectVisitData,
  UpdateSubjectVisitData,
} from '@/lib/types/clinical-trials';
import type { ActionResponse } from '@/lib/types';

// =============================================
// GET SUBJECT VISITS
// =============================================

export async function getSubjectVisits(
  companyId: string,
  filters: SubjectVisitFilters = {}
): Promise<ActionResponse<{ visits: SubjectVisitWithRelations[]; total: number }>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('subject_visits')
      .select(`
        *,
        subject:subjects(id, subject_number, screening_number),
        site:clinical_sites(id, site_number),
        template_visit:template_visits(id, visit_name),
        activities:subject_activities(*)
      `, { count: 'exact' })
      .eq('company_id', companyId);

    // Apply filters
    if (filters.subject_id) {
      query = query.eq('subject_id', filters.subject_id);
    }

    if (filters.site_id) {
      query = query.eq('site_id', filters.site_id);
    }

    if (filters.visit_type && filters.visit_type !== 'all') {
      query = query.eq('visit_type', filters.visit_type);
    }

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // Pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to).order('sequence', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching subject visits:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        visits: data || [],
        total: count || 0,
      },
    };
  } catch (error) {
    console.error('Error in getSubjectVisits:', error);
    return { success: false, error: 'Failed to fetch subject visits' };
  }
}

// =============================================
// GET SUBJECT VISITS BY TYPE
// =============================================

export async function getSubjectVisitsByType(
  companyId: string,
  subjectId: string
): Promise<ActionResponse<Record<string, SubjectVisit[]>>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('subject_visits')
      .select('*')
      .eq('subject_id', subjectId)
      .eq('company_id', companyId)
      .order('sequence', { ascending: true });

    if (error) {
      console.error('Error fetching subject visits:', error);
      return { success: false, error: error.message };
    }

    // Group by visit type
    const visitsByType: Record<string, SubjectVisit[]> = {};
    (data || []).forEach((visit) => {
      if (!visitsByType[visit.visit_type]) {
        visitsByType[visit.visit_type] = [];
      }
      visitsByType[visit.visit_type].push(visit);
    });

    return { success: true, data: visitsByType };
  } catch (error) {
    console.error('Error in getSubjectVisitsByType:', error);
    return { success: false, error: 'Failed to fetch subject visits by type' };
  }
}

// =============================================
// COMPLETE VISIT
// =============================================

export async function completeVisit(
  companyId: string,
  visitId: string,
  actualDate: string,
  notes?: string
): Promise<ActionResponse<SubjectVisit>> {
  try {
    const supabase = await createClient();

    // Update visit
    const { data, error } = await supabase
      .from('subject_visits')
      .update({
        status: 'completed',
        actual_date: actualDate,
        notes: notes || null,
      })
      .eq('id', visitId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error completing visit:', error);
      return { success: false, error: error.message };
    }

    // Trigger status tracking update
    await supabase.rpc('update_subject_status_from_visit', {
      p_subject_visit_id: visitId,
    });

    revalidatePath('/protected/subjects');

    return { success: true, data };
  } catch (error) {
    console.error('Error in completeVisit:', error);
    return { success: false, error: 'Failed to complete visit' };
  }
}

// =============================================
// MISS VISIT
// =============================================

export async function missVisit(
  companyId: string,
  visitId: string
): Promise<ActionResponse<SubjectVisit>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('subject_visits')
      .update({ status: 'missed' })
      .eq('id', visitId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error marking visit as missed:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/subjects');

    return { success: true, data };
  } catch (error) {
    console.error('Error in missVisit:', error);
    return { success: false, error: 'Failed to mark visit as missed' };
  }
}

// =============================================
// OVERRIDE VISIT STATUS
// =============================================

export async function overrideVisitStatus(
  companyId: string,
  visitId: string,
  newStatus: 'completed' | 'missed'
): Promise<ActionResponse<SubjectVisit>> {
  try {
    const supabase = await createClient();

    const statusMap = {
      completed: 'completed' as const,
      missed: 'missed' as const,
    };

    const { data, error } = await supabase
      .from('subject_visits')
      .update({
        override_status: newStatus,
        status: statusMap[newStatus],
      })
      .eq('id', visitId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error overriding visit status:', error);
      return { success: false, error: error.message };
    }

    // If overriding to completed, trigger status tracking
    if (newStatus === 'completed') {
      await supabase.rpc('update_subject_status_from_visit', {
        p_subject_visit_id: visitId,
      });
    }

    revalidatePath('/protected/subjects');

    return { success: true, data };
  } catch (error) {
    console.error('Error in overrideVisitStatus:', error);
    return { success: false, error: 'Failed to override visit status' };
  }
}

// =============================================
// CREATE UNSCHEDULED VISIT
// =============================================

export async function createUnscheduledVisit(
  companyId: string,
  profileId: string,
  email: string,
  formData: CreateSubjectVisitData
): Promise<ActionResponse<SubjectVisit>> {
  try {
    const supabase = await createClient();

    // Get the max sequence for this subject
    const { data: maxSeq } = await supabase
      .from('subject_visits')
      .select('sequence')
      .eq('subject_id', formData.subject_id)
      .order('sequence', { ascending: false })
      .limit(1)
      .single();

    const nextSequence = (maxSeq?.sequence || 0) + 1;

    const { data, error } = await supabase
      .from('subject_visits')
      .insert({
        ...formData,
        company_id: companyId,
        created_by_id: profileId,
        creator_email: email,
        sequence: formData.sequence ?? nextSequence,
        visit_type: 'unscheduled',
        is_planned: false,
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating unscheduled visit:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/subjects');

    return { success: true, data };
  } catch (error) {
    console.error('Error in createUnscheduledVisit:', error);
    return { success: false, error: 'Failed to create unscheduled visit' };
  }
}

// =============================================
// PLAN VISITS BY TYPE
// =============================================

export async function planVisitsByType(
  companyId: string,
  subjectId: string,
  visitType: string
): Promise<ActionResponse<{ updated: number }>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('subject_visits')
      .update({ is_planned: true })
      .eq('subject_id', subjectId)
      .eq('visit_type', visitType)
      .eq('company_id', companyId)
      .select('id');

    if (error) {
      console.error('Error planning visits by type:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/subjects');

    return {
      success: true,
      data: { updated: data?.length || 0 },
    };
  } catch (error) {
    console.error('Error in planVisitsByType:', error);
    return { success: false, error: 'Failed to plan visits by type' };
  }
}

// =============================================
// UNPLAN VISITS BY TYPE
// =============================================

export async function unplanVisitsByType(
  companyId: string,
  subjectId: string,
  visitType: string
): Promise<ActionResponse<{ updated: number }>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('subject_visits')
      .update({ is_planned: false })
      .eq('subject_id', subjectId)
      .eq('visit_type', visitType)
      .eq('company_id', companyId)
      .select('id');

    if (error) {
      console.error('Error unplanning visits by type:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/subjects');

    return {
      success: true,
      data: { updated: data?.length || 0 },
    };
  } catch (error) {
    console.error('Error in unplanVisitsByType:', error);
    return { success: false, error: 'Failed to unplan visits by type' };
  }
}

// =============================================
// DELETE VISITS BY TYPE
// =============================================

export async function deleteVisitsByType(
  companyId: string,
  subjectId: string,
  visitType: string
): Promise<ActionResponse<{ deleted: number }>> {
  try {
    const supabase = await createClient();

    // Get visits to be deleted
    const { data: visits } = await supabase
      .from('subject_visits')
      .select('id')
      .eq('subject_id', subjectId)
      .eq('visit_type', visitType)
      .eq('company_id', companyId);

    const visitIds = visits?.map(v => v.id) || [];

    if (visitIds.length === 0) {
      return {
        success: true,
        data: { deleted: 0 },
      };
    }

    // Delete visits
    const { error } = await supabase
      .from('subject_visits')
      .delete()
      .in('id', visitIds);

    if (error) {
      console.error('Error deleting visits by type:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/subjects');

    return {
      success: true,
      data: { deleted: visitIds.length },
    };
  } catch (error) {
    console.error('Error in deleteVisitsByType:', error);
    return { success: false, error: 'Failed to delete visits by type' };
  }
}
