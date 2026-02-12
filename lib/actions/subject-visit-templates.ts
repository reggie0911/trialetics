'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type {
  SubjectVisitTemplate,
  SubjectVisitTemplateWithRelations,
  CreateSubjectVisitTemplateData,
  UpdateSubjectVisitTemplateData,
  SubjectVisitTemplateFilters,
} from '@/lib/types/clinical-trials';
import type { ActionResponse } from '@/lib/types';

// =============================================
// GET VISIT TEMPLATES
// =============================================

export async function getVisitTemplates(
  companyId: string,
  filters: SubjectVisitTemplateFilters = {}
): Promise<ActionResponse<{ templates: SubjectVisitTemplateWithRelations[]; total: number }>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('subject_visit_templates')
      .select(`
        *,
        protocol:clinical_protocols(id, protocol_number, title),
        visits:template_visits(count)
      `, { count: 'exact' })
      .eq('company_id', companyId);

    // Apply filters
    if (filters.protocol_id) {
      query = query.eq('protocol_id', filters.protocol_id);
    }

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    // Pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching visit templates:', error);
      return { success: false, error: error.message };
    }

    // Transform data to include visits_count
    const templates = (data || []).map(template => ({
      ...template,
      visits_count: template.visits?.[0]?.count || 0,
    }));

    return {
      success: true,
      data: {
        templates,
        total: count || 0,
      },
    };
  } catch (error) {
    console.error('Error in getVisitTemplates:', error);
    return { success: false, error: 'Failed to fetch visit templates' };
  }
}

// =============================================
// GET SINGLE VISIT TEMPLATE
// =============================================

export async function getVisitTemplate(
  companyId: string,
  id: string
): Promise<ActionResponse<SubjectVisitTemplateWithRelations>> {
  try {
    const supabase = await createClient();

    // Get the template
    const { data: templates, error: templateError } = await supabase
      .from('subject_visit_templates')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId);

    if (templateError) {
      console.error('Error fetching visit template:', JSON.stringify(templateError));
      return { success: false, error: templateError.message || 'Unknown error fetching template' };
    }

    const template = templates?.[0];

    if (!template) {
      return { success: false, error: 'Visit template not found' };
    }

    // Get protocol separately
    let protocol = null;
    if (template.protocol_id) {
      const { data: protocolData } = await supabase
        .from('clinical_protocols')
        .select('id, protocol_number, title')
        .eq('id', template.protocol_id)
        .single();
      protocol = protocolData;
    }

    // Get visits
    const { data: visits } = await supabase
      .from('template_visits')
      .select('*')
      .eq('template_id', id)
      .order('sequence', { ascending: true });

    // For each visit, get activities
    const visitsWithActivities = await Promise.all(
      (visits || []).map(async (visit) => {
        const { data: activities } = await supabase
          .from('template_activities')
          .select('*')
          .eq('template_visit_id', visit.id)
          .order('activity_name', { ascending: true });

        return {
          ...visit,
          activities: activities || [],
        };
      })
    );

    return {
      success: true,
      data: {
        ...template,
        protocol,
        visits: visitsWithActivities,
        visits_count: visitsWithActivities.length,
      },
    };
  } catch (error) {
    console.error('Error in getVisitTemplate:', error);
    return { success: false, error: 'Failed to fetch visit template' };
  }
}

// Alias for consistency
export const getVisitTemplateById = getVisitTemplate;

// =============================================
// CREATE VISIT TEMPLATE
// =============================================

export async function createVisitTemplate(
  companyId: string,
  profileId: string,
  email: string,
  formData: CreateSubjectVisitTemplateData
): Promise<ActionResponse<SubjectVisitTemplate>> {
  try {
    const supabase = await createClient();

    // Check if version already exists
    const { data: existing } = await supabase
      .from('subject_visit_templates')
      .select('id')
      .eq('protocol_id', formData.protocol_id)
      .eq('version_number', formData.version_number)
      .single();

    if (existing) {
      return { success: false, error: 'A template with this version number already exists for this protocol' };
    }

    // Only include columns that exist in the schema
    const { data, error } = await supabase
      .from('subject_visit_templates')
      .insert({
        company_id: companyId,
        protocol_id: formData.protocol_id,
        version_number: formData.version_number,
        name: formData.name,
        description: formData.description || null,
        is_active: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating visit template:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/visit-templates');
    revalidatePath('/protected/clinical-trials');

    return { success: true, data };
  } catch (error) {
    console.error('Error in createVisitTemplate:', error);
    return { success: false, error: 'Failed to create visit template' };
  }
}

// =============================================
// UPDATE VISIT TEMPLATE
// =============================================

export async function updateVisitTemplate(
  companyId: string,
  id: string,
  formData: UpdateSubjectVisitTemplateData
): Promise<ActionResponse<SubjectVisitTemplate>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('subject_visit_templates')
      .update({
        name: formData.name,
        description: formData.description,
        version_number: formData.version_number,
        is_active: formData.is_active,
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating visit template:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/visit-templates');
    revalidatePath('/protected/clinical-trials');

    return { success: true, data };
  } catch (error) {
    console.error('Error in updateVisitTemplate:', error);
    return { success: false, error: 'Failed to update visit template' };
  }
}

// =============================================
// APPROVE VISIT TEMPLATE (sets is_active to true)
// =============================================

export async function approveVisitTemplate(
  companyId: string,
  id: string,
  _approvalDate: string
): Promise<ActionResponse<SubjectVisitTemplate>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('subject_visit_templates')
      .update({
        is_active: true,
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error approving visit template:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/visit-templates');
    revalidatePath('/protected/clinical-trials');

    return { success: true, data };
  } catch (error) {
    console.error('Error in approveVisitTemplate:', error);
    return { success: false, error: 'Failed to approve visit template' };
  }
}

// =============================================
// COPY TEMPLATE VERSION
// =============================================

export async function copyTemplateVersion(
  companyId: string,
  profileId: string,
  email: string,
  sourceId: string,
  newVersionNumber: string
): Promise<ActionResponse<SubjectVisitTemplate>> {
  try {
    const supabase = await createClient();

    // Get source template
    const { data: sourceTemplate, error: fetchError } = await supabase
      .from('subject_visit_templates')
      .select('*')
      .eq('id', sourceId)
      .eq('company_id', companyId)
      .single();

    if (fetchError || !sourceTemplate) {
      return { success: false, error: 'Source template not found' };
    }

    // Check if new version already exists
    const { data: existing } = await supabase
      .from('subject_visit_templates')
      .select('id')
      .eq('protocol_id', sourceTemplate.protocol_id)
      .eq('version_number', newVersionNumber)
      .single();

    if (existing) {
      return { success: false, error: 'A template with this version number already exists' };
    }

    // Create new template with only columns that exist
    const { data: newTemplate, error: createError } = await supabase
      .from('subject_visit_templates')
      .insert({
        company_id: companyId,
        protocol_id: sourceTemplate.protocol_id,
        version_number: newVersionNumber,
        name: sourceTemplate.name,
        description: sourceTemplate.description,
        is_active: false,
      })
      .select()
      .single();

    if (createError || !newTemplate) {
      return { success: false, error: 'Failed to create new template version' };
    }

    // Copy visits - get source visits
    const { data: sourceVisits } = await supabase
      .from('template_visits')
      .select('*')
      .eq('template_id', sourceId)
      .order('sequence', { ascending: true });

    if (sourceVisits && sourceVisits.length > 0) {
      for (const visit of sourceVisits) {
        const { data: newVisit, error: visitError } = await supabase
          .from('template_visits')
          .insert({
            company_id: companyId,
            template_id: newTemplate.id,
            visit_name: visit.visit_name,
            visit_type: visit.visit_type,
            sequence: visit.sequence,
            day_from_baseline: visit.day_from_baseline,
            visit_window_before: visit.visit_window_before,
            visit_window_after: visit.visit_window_after,
            description: visit.description,
            metadata: visit.metadata,
          })
          .select()
          .single();

        if (!visitError && newVisit) {
          // Get and copy activities
          const { data: sourceActivities } = await supabase
            .from('template_activities')
            .select('*')
            .eq('template_visit_id', visit.id);

          if (sourceActivities && sourceActivities.length > 0) {
            const activities = sourceActivities.map(activity => ({
              company_id: companyId,
              template_visit_id: newVisit.id,
              activity_name: activity.activity_name,
              activity_type: activity.activity_type,
              is_required: activity.is_required,
            }));

            await supabase.from('template_activities').insert(activities);
          }
        }
      }
    }

    revalidatePath('/protected/visit-templates');
    revalidatePath('/protected/clinical-trials');

    return { success: true, data: newTemplate };
  } catch (error) {
    console.error('Error in copyTemplateVersion:', error);
    return { success: false, error: 'Failed to copy template version' };
  }
}

// =============================================
// DELETE VISIT TEMPLATE
// =============================================

export async function deleteVisitTemplate(
  companyId: string,
  id: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('subject_visit_templates')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error deleting visit template:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/visit-templates');
    revalidatePath('/protected/clinical-trials');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in deleteVisitTemplate:', error);
    return { success: false, error: 'Failed to delete visit template' };
  }
}

// =============================================
// ACTIVATE TEMPLATE
// =============================================

export async function activateTemplate(
  companyId: string,
  id: string
): Promise<ActionResponse<SubjectVisitTemplate>> {
  try {
    const supabase = await createClient();

    // Get template to find protocol for deactivating others
    const { data: template } = await supabase
      .from('subject_visit_templates')
      .select('protocol_id')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    // Deactivate other templates for this protocol
    await supabase
      .from('subject_visit_templates')
      .update({ is_active: false })
      .eq('protocol_id', template.protocol_id)
      .eq('company_id', companyId);

    // Activate this template
    const { data, error } = await supabase
      .from('subject_visit_templates')
      .update({ is_active: true })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error activating template:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/visit-templates');
    revalidatePath('/protected/clinical-trials');

    return { success: true, data };
  } catch (error) {
    console.error('Error in activateTemplate:', error);
    return { success: false, error: 'Failed to activate template' };
  }
}
