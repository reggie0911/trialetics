'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  TripReport,
  TripReportWithRelations,
  TripReportChecklistItem,
  TripReportFollowUpItem,
  TripReportAttendee,
  TripReportCrfTracking,
  TripReportApproval,
  TripReportStatus,
  ChecklistItemStatus,
  FollowUpItemStatus,
  TripReportSummary,
  ChecklistResponse,
  AttendeeType,
} from '@/lib/types/trip-reports';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// =============================================
// Trip Reports
// =============================================

export async function getTripReports(
  companyId: string,
  filters?: { status?: TripReportStatus; organization_id?: string }
): Promise<ActionResponse<TripReportWithRelations[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    let visitIds: string[] | null = null;
    if (filters?.organization_id) {
      const { data: visits } = await supabase
        .from('site_visits')
        .select('id')
        .eq('organization_id', filters.organization_id);
      visitIds = (visits || []).map((v) => v.id);
      if (visitIds.length === 0) {
        return { success: true, data: [] };
      }
    }

    let query = supabase
      .from('trip_reports')
      .select(`
        *,
        site_visit:site_visits (
          id,
          visit_name,
          visit_type,
          visit_start,
          visit_status,
          organization_id,
          organization:organizations (id, name)
        )
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (visitIds) {
      query = query.in('site_visit_id', visitIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching trip reports:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []) as TripReportWithRelations[] };
  } catch (error) {
    console.error('Error in getTripReports:', error);
    return { success: false, error: 'Failed to fetch trip reports' };
  }
}

export async function getTripReportsByOrganization(
  organizationId: string
): Promise<ActionResponse<TripReportWithRelations[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: visits } = await supabase
      .from('site_visits')
      .select('id')
      .eq('organization_id', organizationId);

    const visitIds = (visits || []).map((v: { id: string }) => v.id);
    if (visitIds.length === 0) {
      return { success: true, data: [] };
    }

    const { data, error } = await supabase
      .from('trip_reports')
      .select(`
        *,
        site_visit:site_visits (
          id,
          visit_name,
          visit_type,
          visit_start,
          visit_status,
          organization_id,
          organization:organizations (id, name)
        )
      `)
      .in('site_visit_id', visitIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching trip reports:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []) as TripReportWithRelations[] };
  } catch (error) {
    console.error('Error in getTripReportsByOrganization:', error);
    return { success: false, error: 'Failed to fetch trip reports' };
  }
}

export async function getTripReport(
  tripReportId: string
): Promise<ActionResponse<TripReportWithRelations>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: report, error } = await supabase
      .from('trip_reports')
      .select(`
        *,
        site_visit:site_visits (
          id,
          visit_name,
          visit_type,
          visit_start,
          visit_end,
          visit_status,
          organization_id,
          protocol_id,
          organization:organizations (id, name),
          protocol:clinical_protocols (id, protocol_number, title)
        ),
        template:trip_report_templates (*),
        reviewer:profiles!reviewer_id (id, first_name, email),
        approver:profiles!approver_id (id, first_name, email),
        assigned_to:profiles!assigned_to_id (id, first_name, email)
      `)
      .eq('id', tripReportId)
      .single();

    if (error) {
      console.error('Error fetching trip report:', error);
      return { success: false, error: error.message };
    }

    const [checklistRes, followUpRes, attendeesRes, crfRes, approvalsRes] = await Promise.all([
      supabase.from('trip_report_checklist_items').select('*').eq('trip_report_id', tripReportId).order('sort_order'),
      supabase.from('trip_report_follow_up_items').select('*').eq('trip_report_id', tripReportId).order('sort_order'),
      supabase.from('trip_report_attendees').select('*, contact:contacts(id, first_name, last_name, email)'),
      supabase.from('trip_report_crf_tracking').select('*').eq('trip_report_id', tripReportId),
      supabase.from('trip_report_approvals').select('*').eq('trip_report_id', tripReportId).order('updated_at', { ascending: false }),
    ]);

    const withRelations: TripReportWithRelations = {
      ...report,
      checklist_items: checklistRes.data || [],
      follow_up_items: followUpRes.data || [],
      attendees: attendeesRes.data || [],
      crf_tracking: crfRes.data || [],
      approvals: approvalsRes.data || [],
    };

    return { success: true, data: withRelations };
  } catch (error) {
    console.error('Error in getTripReport:', error);
    return { success: false, error: 'Failed to fetch trip report' };
  }
}

export async function getTripReportBySiteVisit(
  siteVisitId: string
): Promise<ActionResponse<TripReportWithRelations | null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: report, error } = await supabase
      .from('trip_reports')
      .select(`
        *,
        site_visit:site_visits (
          id,
          visit_name,
          visit_type,
          visit_start,
          visit_end,
          visit_status,
          organization_id,
          protocol_id,
          organization:organizations (id, name),
          protocol:clinical_protocols (id, protocol_number, title)
        ),
        template:trip_report_templates (*),
        reviewer:profiles!reviewer_id (id, first_name, email),
        approver:profiles!approver_id (id, first_name, email),
        assigned_to:profiles!assigned_to_id (id, first_name, email)
      `)
      .eq('site_visit_id', siteVisitId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching trip report by site visit:', error);
      return { success: false, error: error.message };
    }

    if (!report) {
      return { success: true, data: null };
    }

    const [checklistRes, followUpRes, attendeesRes, crfRes, approvalsRes] = await Promise.all([
      supabase.from('trip_report_checklist_items').select('*').eq('trip_report_id', report.id).order('sort_order'),
      supabase.from('trip_report_follow_up_items').select('*').eq('trip_report_id', report.id).order('sort_order'),
      supabase.from('trip_report_attendees').select('*, contact:contacts(id, first_name, last_name, email)'),
      supabase.from('trip_report_crf_tracking').select('*').eq('trip_report_id', report.id),
      supabase.from('trip_report_approvals').select('*').eq('trip_report_id', report.id).order('updated_at', { ascending: false }),
    ]);

    const withRelations: TripReportWithRelations = {
      ...report,
      checklist_items: checklistRes.data || [],
      follow_up_items: followUpRes.data || [],
      attendees: attendeesRes.data || [],
      crf_tracking: crfRes.data || [],
      approvals: approvalsRes.data || [],
    };

    return { success: true, data: withRelations };
  } catch (error) {
    console.error('Error in getTripReportBySiteVisit:', error);
    return { success: false, error: 'Failed to fetch trip report' };
  }
}

export async function createTripReport(
  siteVisitId: string,
  data: {
    template_id?: string | null;
    assigned_to_id?: string | null;
    notes?: string | null;
  }
): Promise<ActionResponse<TripReport>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const { data: template } = data.template_id
      ? await supabase.from('trip_report_templates').select('*, trip_report_template_details(*)').eq('id', data.template_id).single()
      : { data: null };

    const { data: report, error } = await supabase
      .from('trip_reports')
      .insert({
        site_visit_id: siteVisitId,
        template_id: data.template_id ?? null,
        status: data.template_id ? 'in_progress' : 'not_started',
        version: 1,
        assigned_to_id: data.assigned_to_id ?? profile?.id ?? null,
        notes: data.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating trip report:', error);
      return { success: false, error: error.message };
    }

    if (template?.data?.trip_report_template_details) {
      const details = template.data.trip_report_template_details as Array<{ activity_type: string; activity: string; priority: string | null; sort_order: number; report_order?: number; report_sub_section?: string | null }>;
      for (const d of details) {
        const order = d.report_order ?? d.sort_order ?? 0;
        if (d.activity_type === 'checklist') {
          await supabase.from('trip_report_checklist_items').insert({
            trip_report_id: report.id,
            activity: d.activity,
            status: 'pending',
            sort_order: order,
            report_sub_section: d.report_sub_section ?? null,
          });
        } else {
          await supabase.from('trip_report_follow_up_items').insert({
            trip_report_id: report.id,
            activity: d.activity,
            status: 'open',
            sort_order: order,
          });
        }
      }
    }

    revalidatePath('/protected/trip-reports');
    revalidatePath(`/protected/trip-reports/${report.id}`);
    return { success: true, data: report };
  } catch (error) {
    console.error('Error in createTripReport:', error);
    return { success: false, error: 'Failed to create trip report' };
  }
}

export async function updateTripReport(
  tripReportId: string,
  data: {
    status?: TripReportStatus;
    completed_date?: string | null;
    trip_report_completed_date?: string | null;
    reviewer_id?: string | null;
    approver_id?: string | null;
    reviewer_comments?: string | null;
    approver_comments?: string | null;
    assigned_to_id?: string | null;
    notes?: string | null;
    narrative?: string | null;
    study_info_reviewer_comments?: string | null;
    site_attendees_reviewer_comments?: string | null;
    sponsor_attendees_reviewer_comments?: string | null;
    crf_reviewer_comments?: string | null;
  }
): Promise<ActionResponse<TripReport>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('user_id', user.id)
      .single();

    const { data: existing } = await supabase
      .from('trip_reports')
      .select('status')
      .eq('id', tripReportId)
      .single();

    const updatePayload: Record<string, unknown> = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    if (data.status && data.status !== existing?.status) {
      await supabase.from('trip_report_approvals').insert({
        trip_report_id: tripReportId,
        login: profile?.email ?? null,
        old_status: existing?.status ?? null,
        new_status: data.status,
      });
    }

    const { data: report, error } = await supabase
      .from('trip_reports')
      .update(updatePayload)
      .eq('id', tripReportId)
      .select()
      .single();

    if (error) {
      console.error('Error updating trip report:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/trip-reports');
    revalidatePath(`/protected/trip-reports/${tripReportId}`);
    if (report?.site_visit_id) {
      const { data: sv } = await supabase.from('site_visits').select('organization_id').eq('id', report.site_visit_id).single();
      if (sv?.organization_id) {
        revalidatePath(`/protected/contacts-organizations/${sv.organization_id}`);
      }
    }
    return { success: true, data: report };
  } catch (error) {
    console.error('Error in updateTripReport:', error);
    return { success: false, error: 'Failed to update trip report' };
  }
}

export async function createTripReportVersion(
  tripReportId: string
): Promise<ActionResponse<TripReport>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: existing, error: fetchError } = await supabase
      .from('trip_reports')
      .select('*')
      .eq('id', tripReportId)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: 'Trip report not found' };
    }

    if (existing.status !== 'approved' && existing.status !== 'obsolete') {
      return { success: false, error: 'Can only create version from approved or obsolete report' };
    }

    const newVersion = (existing.version || 1) + 1;

    const { data: newReport, error } = await supabase
      .from('trip_reports')
      .insert({
        site_visit_id: existing.site_visit_id,
        template_id: existing.template_id,
        status: 'in_progress',
        version: newVersion,
        assigned_to_id: existing.assigned_to_id,
        notes: existing.notes,
        narrative: existing.narrative ?? null,
        study_info_reviewer_comments: null,
        site_attendees_reviewer_comments: null,
        sponsor_attendees_reviewer_comments: null,
        crf_reviewer_comments: null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating trip report version:', error);
      return { success: false, error: error.message };
    }

    const [checklistRes, followUpRes] = await Promise.all([
      supabase.from('trip_report_checklist_items').select('*').eq('trip_report_id', tripReportId),
      supabase.from('trip_report_follow_up_items').select('*').eq('trip_report_id', tripReportId),
    ]);

    for (const c of checklistRes.data || []) {
      await supabase.from('trip_report_checklist_items').insert({
        trip_report_id: newReport.id,
        activity: c.activity,
        status: 'pending',
        comments: c.comments,
        response: c.response,
        reviewer_comments: null,
        sort_order: c.sort_order,
      });
    }
    for (const f of followUpRes.data || []) {
      await supabase.from('trip_report_follow_up_items').insert({
        trip_report_id: newReport.id,
        activity: f.activity,
        status: 'open',
        completed_date: null,
        category: f.category,
        description: f.description ?? f.activity,
        date_opened: f.date_opened,
        action_due_date: f.action_due_date,
        date_resolved: null,
        reviewer_comments: null,
        sort_order: f.sort_order,
      });
    }

    if (existing.status === 'approved') {
      await supabase
        .from('trip_reports')
        .update({ status: 'obsolete', updated_at: new Date().toISOString() })
        .eq('id', tripReportId);
    }

    revalidatePath('/protected/trip-reports');
    revalidatePath(`/protected/trip-reports/${newReport.id}`);
    return { success: true, data: newReport };
  } catch (error) {
    console.error('Error in createTripReportVersion:', error);
    return { success: false, error: 'Failed to create trip report version' };
  }
}

export async function getTripReportSummary(
  tripReportId: string
): Promise<ActionResponse<TripReportSummary>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const [checklistRes, followUpRes, attendeesRes, crfRes] = await Promise.all([
      supabase.from('trip_report_checklist_items').select('id, status').eq('trip_report_id', tripReportId),
      supabase.from('trip_report_follow_up_items').select('id, status, completed_date').eq('trip_report_id', tripReportId),
      supabase.from('trip_report_attendees').select('id').eq('trip_report_id', tripReportId),
      supabase.from('trip_report_crf_tracking').select('id, source_verified').eq('trip_report_id', tripReportId),
    ]);

    const checklists = checklistRes.data || [];
    const followUps = followUpRes.data || [];
    const crfItems = crfRes.data || [];

    return {
      success: true,
      data: {
        checklists_completed: checklists.filter((c) => c.status === 'done' || c.status === 'completed').length,
        checklists_total: checklists.length,
        follow_ups_completed: followUps.filter((f) => f.completed_date || f.status === 'done').length,
        follow_ups_total: followUps.length,
        current_follow_ups_completed: followUps.filter((f) => f.completed_date || f.status === 'done').length,
        current_follow_ups_total: followUps.length,
        crf_completed: crfItems.filter((c) => c.source_verified).length,
        crf_total: crfItems.length,
        attendees_count: (attendeesRes.data || []).length,
      },
    };
  } catch (error) {
    console.error('Error in getTripReportSummary:', error);
    return { success: false, error: 'Failed to fetch trip report summary' };
  }
}

// =============================================
// Checklist Items
// =============================================

export async function updateChecklistItem(
  itemId: string,
  data: {
    status?: ChecklistItemStatus;
    comments?: string | null;
    response?: ChecklistResponse | null;
    reviewer_comments?: string | null;
  }
): Promise<ActionResponse<TripReportChecklistItem>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: item, error } = await supabase
      .from('trip_report_checklist_items')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('Error updating checklist item:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/protected/trip-reports/${item?.trip_report_id}`);
    return { success: true, data: item };
  } catch (error) {
    console.error('Error in updateChecklistItem:', error);
    return { success: false, error: 'Failed to update checklist item' };
  }
}

export async function addChecklistItem(
  tripReportId: string,
  activity: string
): Promise<ActionResponse<TripReportChecklistItem>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { count } = await supabase
      .from('trip_report_checklist_items')
      .select('*', { count: 'exact', head: true })
      .eq('trip_report_id', tripReportId);

    const { data: item, error } = await supabase
      .from('trip_report_checklist_items')
      .insert({
        trip_report_id: tripReportId,
        activity,
        status: 'pending',
        sort_order: (count ?? 0),
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding checklist item:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/protected/trip-reports/${tripReportId}`);
    return { success: true, data: item };
  } catch (error) {
    console.error('Error in addChecklistItem:', error);
    return { success: false, error: 'Failed to add checklist item' };
  }
}

export async function deleteChecklistItem(itemId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: item } = await supabase
      .from('trip_report_checklist_items')
      .select('trip_report_id')
      .eq('id', itemId)
      .single();

    const { error } = await supabase
      .from('trip_report_checklist_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting checklist item:', error);
      return { success: false, error: error.message };
    }

    if (item?.trip_report_id) {
      revalidatePath(`/protected/trip-reports/${item.trip_report_id}`);
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in deleteChecklistItem:', error);
    return { success: false, error: 'Failed to delete checklist item' };
  }
}

// =============================================
// Follow-up Items
// =============================================

export async function updateFollowUpItem(
  itemId: string,
  data: {
    status?: FollowUpItemStatus;
    completed_date?: string | null;
    activity?: string;
    category?: string | null;
    description?: string | null;
    date_opened?: string | null;
    action_due_date?: string | null;
    date_resolved?: string | null;
    reviewer_comments?: string | null;
  }
): Promise<ActionResponse<TripReportFollowUpItem>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: item, error } = await supabase
      .from('trip_report_follow_up_items')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('Error updating follow-up item:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/protected/trip-reports/${item?.trip_report_id}`);
    return { success: true, data: item };
  } catch (error) {
    console.error('Error in updateFollowUpItem:', error);
    return { success: false, error: 'Failed to update follow-up item' };
  }
}

export async function addFollowUpItem(
  tripReportId: string,
  activity: string,
  options?: {
    description?: string | null;
    category?: string | null;
    date_opened?: string | null;
    action_due_date?: string | null;
  }
): Promise<ActionResponse<TripReportFollowUpItem>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { count } = await supabase
      .from('trip_report_follow_up_items')
      .select('*', { count: 'exact', head: true })
      .eq('trip_report_id', tripReportId);

    const { data: item, error } = await supabase
      .from('trip_report_follow_up_items')
      .insert({
        trip_report_id: tripReportId,
        activity,
        description: options?.description ?? activity,
        category: options?.category ?? null,
        date_opened: options?.date_opened ?? null,
        action_due_date: options?.action_due_date ?? null,
        status: 'open',
        sort_order: (count ?? 0),
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding follow-up item:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/protected/trip-reports/${tripReportId}`);
    return { success: true, data: item };
  } catch (error) {
    console.error('Error in addFollowUpItem:', error);
    return { success: false, error: 'Failed to add follow-up item' };
  }
}

export async function deleteFollowUpItem(itemId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: item } = await supabase
      .from('trip_report_follow_up_items')
      .select('trip_report_id')
      .eq('id', itemId)
      .single();

    const { error } = await supabase
      .from('trip_report_follow_up_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting follow-up item:', error);
      return { success: false, error: error.message };
    }

    if (item?.trip_report_id) {
      revalidatePath(`/protected/trip-reports/${item.trip_report_id}`);
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in deleteFollowUpItem:', error);
    return { success: false, error: 'Failed to delete follow-up item' };
  }
}

// =============================================
// Attendees
// =============================================

export async function addTripReportAttendee(
  tripReportId: string,
  contactId: string,
  options?: { attendee_type?: AttendeeType; role?: string | null }
): Promise<ActionResponse<TripReportAttendee>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: attendee, error } = await supabase
      .from('trip_report_attendees')
      .insert({
        trip_report_id: tripReportId,
        contact_id: contactId,
        attendee_type: options?.attendee_type ?? 'site',
        role: options?.role ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding attendee:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/protected/trip-reports/${tripReportId}`);
    return { success: true, data: attendee };
  } catch (error) {
    console.error('Error in addTripReportAttendee:', error);
    return { success: false, error: 'Failed to add attendee' };
  }
}

export async function removeTripReportAttendee(
  tripReportId: string,
  contactId: string,
  attendeeType?: AttendeeType
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    let query = supabase
      .from('trip_report_attendees')
      .delete()
      .eq('trip_report_id', tripReportId)
      .eq('contact_id', contactId);
    if (attendeeType) {
      query = query.eq('attendee_type', attendeeType);
    }
    const { error } = await query;

    if (error) {
      console.error('Error removing attendee:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/protected/trip-reports/${tripReportId}`);
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in removeTripReportAttendee:', error);
    return { success: false, error: 'Failed to remove attendee' };
  }
}

// =============================================
// CRF Tracking
// =============================================

export async function addTripReportCrfTracking(
  tripReportId: string,
  data: {
    subject_identifier?: string | null;
    visit_name?: string | null;
    crf_name?: string | null;
    sdv_type?: 'partial' | 'complete' | null;
    subject_visit_id?: string | null;
  }
): Promise<ActionResponse<TripReportCrfTracking>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: item, error } = await supabase
      .from('trip_report_crf_tracking')
      .insert({
        trip_report_id: tripReportId,
        subject_identifier: data.subject_identifier ?? null,
        visit_name: data.visit_name ?? null,
        crf_name: data.crf_name ?? data.visit_name ?? null,
        sdv_type: data.sdv_type ?? null,
        subject_visit_id: data.subject_visit_id ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding CRF tracking:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/protected/trip-reports/${tripReportId}`);
    return { success: true, data: item };
  } catch (error) {
    console.error('Error in addTripReportCrfTracking:', error);
    return { success: false, error: 'Failed to add CRF tracking' };
  }
}

export async function updateTripReportCrfTracking(
  itemId: string,
  data: {
    subject_identifier?: string | null;
    visit_name?: string | null;
    crf_name?: string | null;
    sdv_type?: 'partial' | 'complete' | null;
    source_verified?: boolean;
    retrieved?: boolean;
    page_numbers_verified?: string | null;
    charts_reviewed_date?: string | null;
    forms_signed_date?: string | null;
  }
): Promise<ActionResponse<TripReportCrfTracking>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: item, error } = await supabase
      .from('trip_report_crf_tracking')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('Error updating CRF tracking:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/protected/trip-reports/${item?.trip_report_id}`);
    return { success: true, data: item };
  } catch (error) {
    console.error('Error in updateTripReportCrfTracking:', error);
    return { success: false, error: 'Failed to update CRF tracking' };
  }
}

export async function deleteTripReportCrfTracking(itemId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: item } = await supabase
      .from('trip_report_crf_tracking')
      .select('trip_report_id')
      .eq('id', itemId)
      .single();

    const { error } = await supabase
      .from('trip_report_crf_tracking')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting CRF tracking:', error);
      return { success: false, error: error.message };
    }

    if (item?.trip_report_id) {
      revalidatePath(`/protected/trip-reports/${item.trip_report_id}`);
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in deleteTripReportCrfTracking:', error);
    return { success: false, error: 'Failed to delete CRF tracking' };
  }
}
