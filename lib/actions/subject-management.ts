'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type {
  Subject,
  SubjectWithRelations,
  CreateSubjectData,
  UpdateSubjectData,
  SubjectFilters,
  ScheduleSubjectData,
  RescheduleSubjectData,
  RandomizeSubjectData,
  TransferSubjectData,
  SubjectTransferHistory,
  InformedConsentVersion,
} from '@/lib/types/clinical-trials';
import type { ActionResponse } from '@/lib/types';

// =============================================
// GET SUBJECTS
// =============================================

export async function getSubjects(
  companyId: string,
  filters: SubjectFilters = {}
): Promise<ActionResponse<{ subjects: SubjectWithRelations[]; total: number }>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('subjects')
      .select(`
        *,
        site:clinical_sites(
          id,
          site_number,
          status,
          protocol:clinical_protocols(id, protocol_number, title),
          organization:organizations(id, name)
        )
      `, { count: 'exact' })
      .eq('company_id', companyId);

    // Apply filters
    if (filters.site_id) {
      query = query.eq('site_id', filters.site_id);
    }

    if (filters.protocol_id) {
      query = query.eq('site.protocol_id', filters.protocol_id);
    }

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.search) {
      query = query.or(`screening_number.ilike.%${filters.search}%,subject_number.ilike.%${filters.search}%,enrollment_id.ilike.%${filters.search}%`);
    }

    // Pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching subjects:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        subjects: data || [],
        total: count || 0,
      },
    };
  } catch (error) {
    console.error('Error in getSubjects:', error);
    return { success: false, error: 'Failed to fetch subjects' };
  }
}

// =============================================
// GET SINGLE SUBJECT
// =============================================

export async function getSubject(
  companyId: string,
  id: string
): Promise<ActionResponse<SubjectWithRelations>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('subjects')
      .select(`
        *,
        site:clinical_sites(
          id,
          site_number,
          status,
          protocol:clinical_protocols(id, protocol_number, title),
          organization:organizations(id, name)
        ),
        visits:subject_visits(
          *,
          activities:subject_activities(*)
        ),
        status_history:subject_status_history(*),
        transfer_history:subject_transfer_history(
          *,
          from_site:clinical_sites!subject_transfer_history_from_site_id_fkey(id, site_number),
          to_site:clinical_sites!subject_transfer_history_to_site_id_fkey(id, site_number)
        )
      `)
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) {
      console.error('Error fetching subject:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Subject not found' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getSubject:', error);
    return { success: false, error: 'Failed to fetch subject' };
  }
}

// =============================================
// CREATE SUBJECT
// =============================================

export async function createSubject(
  companyId: string,
  profileId: string,
  email: string,
  formData: CreateSubjectData
): Promise<ActionResponse<Subject>> {
  try {
    const supabase = await createClient();

    // Check if subject number is unique for this site
    if (formData.subject_number) {
      const { data: existing } = await supabase
        .from('subjects')
        .select('id')
        .eq('site_id', formData.site_id)
        .eq('subject_number', formData.subject_number)
        .single();

      if (existing) {
        return { success: false, error: 'A subject with this number already exists at this site' };
      }
    }

    // Generate screening number if encounter date is provided
    let screeningNumber = null;
    if (formData.encounter_date) {
      const { data: screeningData, error: screeningError } = await supabase
        .rpc('generate_screening_number', {
          p_site_id: formData.site_id,
          p_subject_id: formData.subject_number || 'TEMP',
          p_encounter_date: formData.encounter_date,
        });

      if (!screeningError && screeningData) {
        screeningNumber = screeningData;
      }
    }

    const { data, error } = await supabase
      .from('subjects')
      .insert({
        company_id: companyId,
        created_by_id: profileId,
        creator_email: email,
        screening_number: screeningNumber,
        encounter_date: formData.encounter_date || null,
        status: 'screening',
        informed_consent_versions: [],
        use_last_completed_visit_for_reschedule: false,
        ...formData,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating subject:', error);
      return { success: false, error: error.message };
    }

    // Create initial status history record
    await supabase.from('subject_status_history').insert({
      company_id: companyId,
      subject_id: data.id,
      status: 'screening',
      status_date: formData.encounter_date || new Date().toISOString().split('T')[0],
      is_primary: true,
      comments: 'Subject created',
    });

    revalidatePath('/protected/subjects');
    revalidatePath('/protected/clinical-trials');

    return { success: true, data };
  } catch (error) {
    console.error('Error in createSubject:', error);
    return { success: false, error: 'Failed to create subject' };
  }
}

// =============================================
// UPDATE SUBJECT
// =============================================

export async function updateSubject(
  companyId: string,
  id: string,
  formData: UpdateSubjectData
): Promise<ActionResponse<Subject>> {
  try {
    const supabase = await createClient();

    // If updating subject number, check uniqueness
    if (formData.subject_number) {
      const { data: existing } = await supabase
        .from('subjects')
        .select('id, site_id')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (existing) {
        const { data: duplicate } = await supabase
          .from('subjects')
          .select('id')
          .eq('site_id', existing.site_id)
          .eq('subject_number', formData.subject_number)
          .neq('id', id)
          .single();

        if (duplicate) {
          return { success: false, error: 'A subject with this number already exists at this site' };
        }
      }
    }

    const { data, error } = await supabase
      .from('subjects')
      .update(formData)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating subject:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/subjects');
    revalidatePath('/protected/clinical-trials');

    return { success: true, data };
  } catch (error) {
    console.error('Error in updateSubject:', error);
    return { success: false, error: 'Failed to update subject' };
  }
}

// =============================================
// DELETE SUBJECT
// =============================================

export async function deleteSubject(
  companyId: string,
  id: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error deleting subject:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/subjects');
    revalidatePath('/protected/clinical-trials');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in deleteSubject:', error);
    return { success: false, error: 'Failed to delete subject' };
  }
}

// =============================================
// SCHEDULE SUBJECT
// =============================================

export async function scheduleSubject(
  companyId: string,
  scheduleData: ScheduleSubjectData
): Promise<ActionResponse<{ visits_created: number }>> {
  try {
    const supabase = await createClient();

    // Call the database function to schedule visits
    const { data, error } = await supabase.rpc('schedule_subject_visits', {
      p_subject_id: scheduleData.subject_id,
      p_schedule_date: scheduleData.schedule_date,
    });

    if (error) {
      console.error('Error scheduling subject:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/subjects');

    return {
      success: true,
      data: { visits_created: data || 0 },
    };
  } catch (error) {
    console.error('Error in scheduleSubject:', error);
    return { success: false, error: 'Failed to schedule subject' };
  }
}

// =============================================
// RESCHEDULE SUBJECT
// =============================================

export async function rescheduleSubject(
  companyId: string,
  rescheduleData: RescheduleSubjectData
): Promise<ActionResponse<{ visits_updated: number }>> {
  try {
    const supabase = await createClient();

    // Get subject and visits
    const { data: subject } = await supabase
      .from('subjects')
      .select('*, visits:subject_visits(*)')
      .eq('id', rescheduleData.subject_id)
      .eq('company_id', companyId)
      .single();

    if (!subject) {
      return { success: false, error: 'Subject not found' };
    }

    let updatedCount = 0;

    if (rescheduleData.use_last_completed_visit) {
      // Find last completed visit
      const completedVisits = subject.visits
        ?.filter((v: any) => v.status === 'completed' && v.actual_date && v.planned_date)
        .sort((a: any, b: any) => new Date(b.actual_date).getTime() - new Date(a.actual_date).getTime());

      if (!completedVisits || completedVisits.length === 0) {
        return { success: false, error: 'No completed visits found for rescheduling' };
      }

      const lastVisit = completedVisits[0];
      const plannedDate = new Date(lastVisit.planned_date);
      const actualDate = new Date(lastVisit.actual_date);
      const delayDays = Math.floor((actualDate.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24));

      // Update future visits
      const futureVisits = subject.visits?.filter((v: any) => 
        v.status !== 'completed' && v.planned_date
      );

      for (const visit of futureVisits || []) {
        const newPlannedDate = new Date(visit.planned_date);
        newPlannedDate.setDate(newPlannedDate.getDate() + delayDays);

        const newScheduledDate = new Date(visit.scheduled_date || visit.planned_date);
        newScheduledDate.setDate(newScheduledDate.getDate() + delayDays);

        await supabase
          .from('subject_visits')
          .update({
            planned_date: newPlannedDate.toISOString().split('T')[0],
            scheduled_date: newScheduledDate.toISOString().split('T')[0],
          })
          .eq('id', visit.id);

        updatedCount++;
      }
    } else if (rescheduleData.reschedule_date) {
      // Reschedule from fixed date - would need to recalculate all visit dates
      // This is more complex and would require the original template logic
      return { success: false, error: 'Fixed date rescheduling not yet implemented' };
    }

    // Update subject's reschedule preference
    await supabase
      .from('subjects')
      .update({ use_last_completed_visit_for_reschedule: rescheduleData.use_last_completed_visit })
      .eq('id', rescheduleData.subject_id);

    revalidatePath('/protected/subjects');

    return {
      success: true,
      data: { visits_updated: updatedCount },
    };
  } catch (error) {
    console.error('Error in rescheduleSubject:', error);
    return { success: false, error: 'Failed to reschedule subject' };
  }
}

// =============================================
// TRACK INFORMED CONSENT
// =============================================

export async function trackInformedConsent(
  companyId: string,
  subjectId: string,
  versionData: InformedConsentVersion
): Promise<ActionResponse<Subject>> {
  try {
    const supabase = await createClient();

    // Get current informed consent versions
    const { data: subject } = await supabase
      .from('subjects')
      .select('informed_consent_versions')
      .eq('id', subjectId)
      .eq('company_id', companyId)
      .single();

    if (!subject) {
      return { success: false, error: 'Subject not found' };
    }

    const versions = Array.isArray(subject.informed_consent_versions) 
      ? subject.informed_consent_versions 
      : [];

    // Add new version
    versions.push(versionData);

    const { data, error } = await supabase
      .from('subjects')
      .update({ informed_consent_versions: versions })
      .eq('id', subjectId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error tracking informed consent:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/subjects');

    return { success: true, data };
  } catch (error) {
    console.error('Error in trackInformedConsent:', error);
    return { success: false, error: 'Failed to track informed consent' };
  }
}

// =============================================
// RANDOMIZE SUBJECT
// =============================================

export async function randomizeSubject(
  companyId: string,
  randomizeData: RandomizeSubjectData
): Promise<ActionResponse<Subject>> {
  try {
    const supabase = await createClient();

    // Update subject with randomization info
    const { data, error } = await supabase
      .from('subjects')
      .update({
        randomization_id: randomizeData.randomization_id,
        randomization_date: randomizeData.randomization_date,
        status: 'randomized',
      })
      .eq('id', randomizeData.subject_id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error randomizing subject:', error);
      return { success: false, error: error.message };
    }

    // Clear existing primary status
    await supabase
      .from('subject_status_history')
      .update({ is_primary: false })
      .eq('subject_id', randomizeData.subject_id)
      .eq('is_primary', true);

    // Create status history record
    await supabase.from('subject_status_history').insert({
      company_id: companyId,
      subject_id: randomizeData.subject_id,
      status: 'randomized',
      status_date: randomizeData.randomization_date,
      is_primary: true,
      comments: `Randomized with ID: ${randomizeData.randomization_id}`,
    });

    revalidatePath('/protected/subjects');

    return { success: true, data };
  } catch (error) {
    console.error('Error in randomizeSubject:', error);
    return { success: false, error: 'Failed to randomize subject' };
  }
}

// =============================================
// SCREEN FAILURE
// =============================================

export async function screenFailure(
  companyId: string,
  subjectId: string,
  reason: string,
  date: string
): Promise<ActionResponse<Subject>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('subjects')
      .update({
        screen_failure_reason: reason,
        screen_failure_date: date,
        status: 'screen_failure',
      })
      .eq('id', subjectId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error marking screen failure:', error);
      return { success: false, error: error.message };
    }

    // Clear existing primary status
    await supabase
      .from('subject_status_history')
      .update({ is_primary: false })
      .eq('subject_id', subjectId)
      .eq('is_primary', true);

    // Create status history record
    await supabase.from('subject_status_history').insert({
      company_id: companyId,
      subject_id: subjectId,
      status: 'screen_failure',
      status_date: date,
      is_primary: true,
      comments: reason,
    });

    // Delete future visits
    await supabase
      .from('subject_visits')
      .delete()
      .eq('subject_id', subjectId)
      .neq('status', 'completed')
      .gte('scheduled_date', date);

    revalidatePath('/protected/subjects');

    return { success: true, data };
  } catch (error) {
    console.error('Error in screenFailure:', error);
    return { success: false, error: 'Failed to mark screen failure' };
  }
}

// =============================================
// WITHDRAW SUBJECT
// =============================================

export async function withdrawSubject(
  companyId: string,
  subjectId: string,
  reason: string,
  date: string
): Promise<ActionResponse<Subject>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('subjects')
      .update({
        withdrawn_reason: reason,
        withdrawn_date: date,
        status: 'withdrawn',
      })
      .eq('id', subjectId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error withdrawing subject:', error);
      return { success: false, error: error.message };
    }

    // Clear existing primary status
    await supabase
      .from('subject_status_history')
      .update({ is_primary: false })
      .eq('subject_id', subjectId)
      .eq('is_primary', true);

    // Create status history record
    await supabase.from('subject_status_history').insert({
      company_id: companyId,
      subject_id: subjectId,
      status: 'withdrawn',
      status_date: date,
      is_primary: true,
      comments: reason,
    });

    revalidatePath('/protected/subjects');

    return { success: true, data };
  } catch (error) {
    console.error('Error in withdrawSubject:', error);
    return { success: false, error: 'Failed to withdraw subject' };
  }
}

// =============================================
// EARLY TERMINATE
// =============================================

export async function earlyTerminate(
  companyId: string,
  subjectId: string,
  reason: string,
  date: string
): Promise<ActionResponse<Subject>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('subjects')
      .update({
        early_termination_reason: reason,
        early_terminated_date: date,
        status: 'early_terminated',
      })
      .eq('id', subjectId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error terminating subject early:', error);
      return { success: false, error: error.message };
    }

    // Clear existing primary status
    await supabase
      .from('subject_status_history')
      .update({ is_primary: false })
      .eq('subject_id', subjectId)
      .eq('is_primary', true);

    // Create status history record
    await supabase.from('subject_status_history').insert({
      company_id: companyId,
      subject_id: subjectId,
      status: 'early_terminated',
      status_date: date,
      is_primary: true,
      comments: reason,
    });

    // Delete future visits
    await supabase
      .from('subject_visits')
      .delete()
      .eq('subject_id', subjectId)
      .neq('status', 'completed')
      .gte('scheduled_date', date);

    revalidatePath('/protected/subjects');

    return { success: true, data };
  } catch (error) {
    console.error('Error in earlyTerminate:', error);
    return { success: false, error: 'Failed to terminate subject early' };
  }
}

// =============================================
// TRANSFER SUBJECT
// =============================================

export async function transferSubject(
  companyId: string,
  profileId: string,
  email: string,
  transferData: TransferSubjectData
): Promise<ActionResponse<Subject>> {
  try {
    const supabase = await createClient();

    // Get current subject data
    const { data: subject } = await supabase
      .from('subjects')
      .select('*, site:clinical_sites(id, site_number)')
      .eq('id', transferData.subject_id)
      .eq('company_id', companyId)
      .single();

    if (!subject) {
      return { success: false, error: 'Subject not found' };
    }

    // Update subject site
    const { data, error } = await supabase
      .from('subjects')
      .update({ site_id: transferData.to_site_id })
      .eq('id', transferData.subject_id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error transferring subject:', error);
      return { success: false, error: error.message };
    }

    // Create transfer history record
    await supabase.from('subject_transfer_history').insert({
      company_id: companyId,
      subject_id: transferData.subject_id,
      from_site_id: subject.site_id,
      to_site_id: transferData.to_site_id,
      transfer_date: transferData.transfer_date,
      reason: transferData.reason || null,
      status_at_transfer: subject.status,
      transferred_by: profileId,
      transferred_by_email: email,
      comments: transferData.comments || null,
    });

    revalidatePath('/protected/subjects');
    revalidatePath('/protected/clinical-trials');

    return { success: true, data };
  } catch (error) {
    console.error('Error in transferSubject:', error);
    return { success: false, error: 'Failed to transfer subject' };
  }
}

// =============================================
// GET TRANSFER HISTORY
// =============================================

export async function getTransferHistory(
  companyId: string,
  subjectId: string
): Promise<ActionResponse<SubjectTransferHistory[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('subject_transfer_history')
      .select(`
        *,
        from_site:clinical_sites!subject_transfer_history_from_site_id_fkey(id, site_number),
        to_site:clinical_sites!subject_transfer_history_to_site_id_fkey(id, site_number)
      `)
      .eq('subject_id', subjectId)
      .eq('company_id', companyId)
      .order('transfer_date', { ascending: false });

    if (error) {
      console.error('Error fetching transfer history:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getTransferHistory:', error);
    return { success: false, error: 'Failed to fetch transfer history' };
  }
}
