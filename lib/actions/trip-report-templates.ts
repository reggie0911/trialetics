'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  TripReportTemplate,
  TripReportTemplateDetail,
  TripReportTemplateWithDetails,
  TemplateActivityType,
  TemplatePriority,
} from '@/lib/types/trip-reports';
import type { SiteVisitType } from '@/lib/types/contacts-organizations';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function getTripReportTemplates(
  companyId: string,
  filters?: { visit_type?: SiteVisitType; protocol_id?: string; is_active?: boolean }
): Promise<ActionResponse<TripReportTemplateWithDetails[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    let query = supabase
      .from('trip_report_templates')
      .select(`
        *,
        trip_report_template_details (*)
      `)
      .eq('company_id', companyId)
      .order('name', { ascending: true });

    if (filters?.visit_type) {
      query = query.eq('visit_type', filters.visit_type);
    }
    if (filters?.protocol_id) {
      query = query.eq('protocol_id', filters.protocol_id);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching trip report templates:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []).map((t) => ({
      ...t,
      details: (t as { trip_report_template_details?: TripReportTemplateDetail[] }).trip_report_template_details?.sort(
        (a, b) => (a.report_order ?? a.sort_order) - (b.report_order ?? b.sort_order)
      ) ?? [],
    })) };
  } catch (error) {
    console.error('Error in getTripReportTemplates:', error);
    return { success: false, error: 'Failed to fetch trip report templates' };
  }
}

export async function getTripReportTemplate(
  templateId: string
): Promise<ActionResponse<TripReportTemplateWithDetails>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('trip_report_templates')
      .select(`
        *,
        trip_report_template_details (*)
      `)
      .eq('id', templateId)
      .single();

    if (error) {
      console.error('Error fetching trip report template:', error);
      return { success: false, error: error.message };
    }

    const details = (data as { trip_report_template_details?: TripReportTemplateDetail[] }).trip_report_template_details?.sort(
      (a, b) => (a.report_order ?? a.sort_order) - (b.report_order ?? b.sort_order)
    ) ?? [];

    return { success: true, data: { ...data, details } };
  } catch (error) {
    console.error('Error in getTripReportTemplate:', error);
    return { success: false, error: 'Failed to fetch trip report template' };
  }
}

export async function createTripReportTemplate(
  companyId: string,
  data: {
    name: string;
    visit_type: SiteVisitType;
    protocol_id?: string | null;
    region?: string | null;
    is_active?: boolean;
  }
): Promise<ActionResponse<TripReportTemplate>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: template, error } = await supabase
      .from('trip_report_templates')
      .insert({
        company_id: companyId,
        name: data.name,
        visit_type: data.visit_type,
        protocol_id: data.protocol_id ?? null,
        region: data.region ?? null,
        is_active: data.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating trip report template:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/trip-reports');
    revalidatePath(`/protected/trip-reports/templates/${template.id}`);
    return { success: true, data: template };
  } catch (error) {
    console.error('Error in createTripReportTemplate:', error);
    return { success: false, error: 'Failed to create trip report template' };
  }
}

export async function updateTripReportTemplate(
  templateId: string,
  data: {
    name?: string;
    visit_type?: SiteVisitType;
    protocol_id?: string | null;
    region?: string | null;
    is_active?: boolean;
  }
): Promise<ActionResponse<TripReportTemplate>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: template, error } = await supabase
      .from('trip_report_templates')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Error updating trip report template:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/trip-reports');
    revalidatePath(`/protected/trip-reports/templates/${templateId}`);
    return { success: true, data: template };
  } catch (error) {
    console.error('Error in updateTripReportTemplate:', error);
    return { success: false, error: 'Failed to update trip report template' };
  }
}

export async function deleteTripReportTemplate(
  templateId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('trip_report_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Error deleting trip report template:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/trip-reports');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in deleteTripReportTemplate:', error);
    return { success: false, error: 'Failed to delete trip report template' };
  }
}

export async function getSubSectionOrder(
  templateId: string
): Promise<ActionResponse<string[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('trip_report_template_sub_section_order')
      .select('sub_section_name, sort_order')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching sub-section order:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []).map(d => d.sub_section_name) };
  } catch (error) {
    console.error('Error in getSubSectionOrder:', error);
    return { success: false, error: 'Failed to fetch sub-section order' };
  }
}

export async function upsertSubSectionOrder(
  templateId: string,
  sections: string[]
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    await supabase
      .from('trip_report_template_sub_section_order')
      .delete()
      .eq('template_id', templateId);

    if (sections.length > 0) {
      const rows = sections.map((name, i) => ({
        template_id: templateId,
        sub_section_name: name,
        sort_order: i,
      }));

      const { error } = await supabase
        .from('trip_report_template_sub_section_order')
        .insert(rows);

      if (error) {
        console.error('Error upserting sub-section order:', error);
        return { success: false, error: error.message };
      }
    }

    revalidatePath(`/protected/trip-reports/templates/${templateId}`);
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in upsertSubSectionOrder:', error);
    return { success: false, error: 'Failed to save sub-section order' };
  }
}

export async function upsertTripReportTemplateDetails(
  templateId: string,
  details: Array<{
    id?: string;
    activity_type: TemplateActivityType;
    activity: string;
    priority?: TemplatePriority | null;
    sort_order?: number;
    report_order?: number;
    report_sub_section?: string | null;
  }>
): Promise<ActionResponse<TripReportTemplateDetail[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const existing = await supabase
      .from('trip_report_template_details')
      .select('id')
      .eq('template_id', templateId);

    const existingIds = (existing.data || []).map((d) => d.id);
    const incomingIds = details.filter((d) => d.id).map((d) => d.id!);
    const toDelete = existingIds.filter((id) => !incomingIds.includes(id));

    for (const id of toDelete) {
      await supabase.from('trip_report_template_details').delete().eq('id', id);
    }

    const result: TripReportTemplateDetail[] = [];
    for (let i = 0; i < details.length; i++) {
      const d = details[i];
      const payload = {
        template_id: templateId,
        activity_type: d.activity_type,
        activity: d.activity,
        priority: d.priority ?? null,
        sort_order: d.sort_order ?? i,
        report_order: d.report_order ?? d.sort_order ?? i,
        report_sub_section: d.report_sub_section ?? null,
      };

      if (d.id) {
        const { data: updated, error } = await supabase
          .from('trip_report_template_details')
          .update(payload)
          .eq('id', d.id)
          .select()
          .single();
        if (error) throw error;
        result.push(updated);
      } else {
        const { data: inserted, error } = await supabase
          .from('trip_report_template_details')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        result.push(inserted);
      }
    }

    revalidatePath('/protected/trip-reports');
    revalidatePath(`/protected/trip-reports/templates/${templateId}`);
    return { success: true, data: result.sort((a, b) => (a.report_order ?? a.sort_order) - (b.report_order ?? b.sort_order)) };
  } catch (error) {
    console.error('Error in upsertTripReportTemplateDetails:', error);
    return { success: false, error: 'Failed to upsert template details' };
  }
}
