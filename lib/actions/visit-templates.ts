'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  CreateSubjectVisitTemplateData,
  UpdateSubjectVisitTemplateData,
  SubjectVisitTemplateWithRelations,
  SubjectVisitTemplateFilters,
  CreateTemplateVisitData,
  UpdateTemplateVisitData,
  CreateTemplateActivityData,
  UpdateTemplateActivityData,
  TemplateVisitWithRelations,
} from '@/lib/types/clinical-trials';

// =============================================
// Get Visit Templates
// =============================================

export async function getVisitTemplates(
  companyId: string,
  filters: SubjectVisitTemplateFilters = {}
) {
  const supabase = await createClient();
  const { protocol_id, is_active, page = 1, pageSize = 50 } = filters;

  try {
    let query = supabase
      .from('subject_visit_templates')
      .select(
        `
        *,
        protocol:protocol_id (
          id,
          protocol_number,
          title
        )
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId);

    if (protocol_id) {
      query = query.eq('protocol_id', protocol_id);
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active);
    }

    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching visit templates:', error);
      return {
        success: false,
        error: 'Failed to fetch visit templates',
        data: null,
      };
    }

    return {
      success: true,
      data: {
        templates: data || [],
        total: count || 0,
        page,
        pageSize,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error in getVisitTemplates:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Get Single Visit Template with Visits & Activities
// =============================================

export async function getVisitTemplate(companyId: string, id: string) {
  const supabase = await createClient();

  try {
    // Get template
    const { data: template, error: templateError } = await supabase
      .from('subject_visit_templates')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (templateError || !template) {
      return {
        success: false,
        error: 'Failed to fetch visit template',
        data: null,
      };
    }

    // Get visits with activities
    const { data: visits, error: visitsError } = await supabase
      .from('template_visits')
      .select(
        `
        *,
        activities:template_activities (*)
      `
      )
      .eq('template_id', id)
      .eq('company_id', companyId)
      .order('sequence', { ascending: true });

    if (visitsError) {
      return {
        success: false,
        error: 'Failed to fetch template visits',
        data: null,
      };
    }

    return {
      success: true,
      data: {
        ...template,
        visits: visits || [],
      },
      error: null,
    };
  } catch (error) {
    console.error('Error in getVisitTemplate:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Create Visit Template
// =============================================

export async function createVisitTemplate(
  companyId: string,
  profileId: string,
  email: string,
  data: CreateSubjectVisitTemplateData
) {
  const supabase = await createClient();

  try {
    const { protocol_id, version_number, name, description, is_active, irb_approval_date, metadata } = data;

    // Check for duplicate version_number
    const { data: existing } = await supabase
      .from('subject_visit_templates')
      .select('id')
      .eq('protocol_id', protocol_id)
      .eq('version_number', version_number)
      .eq('company_id', companyId)
      .single();

    if (existing) {
      return {
        success: false,
        error: 'A template with this version number already exists for this protocol',
        data: null,
      };
    }

    const insertData = {
      company_id: companyId,
      protocol_id,
      version_number,
      name,
      description: description || null,
      is_active: is_active !== undefined ? is_active : true,
      irb_approval_date: irb_approval_date || null,
      metadata: metadata || {},
      created_by_id: profileId,
      creator_email: email,
    };

    const { data: template, error } = await supabase
      .from('subject_visit_templates')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating visit template:', error);
      return {
        success: false,
        error: 'Failed to create visit template',
        data: null,
      };
    }

    revalidatePath('/protected/clinical-trials');
    return {
      success: true,
      data: template,
      error: null,
    };
  } catch (error) {
    console.error('Error in createVisitTemplate:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Update Visit Template
// =============================================

export async function updateVisitTemplate(
  companyId: string,
  updateData: UpdateSubjectVisitTemplateData
) {
  const supabase = await createClient();

  try {
    const { id, ...rest } = updateData;

    const updates: Record<string, any> = { ...rest, updated_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from('subject_visit_templates')
      .update(updates)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating visit template:', error);
      return {
        success: false,
        error: 'Failed to update visit template',
        data: null,
      };
    }

    revalidatePath('/protected/clinical-trials');
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error in updateVisitTemplate:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Delete Visit Template
// =============================================

export async function deleteVisitTemplate(companyId: string, id: string) {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('subject_visit_templates')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error deleting visit template:', error);
      return {
        success: false,
        error: 'Failed to delete visit template',
      };
    }

    revalidatePath('/protected/clinical-trials');
    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error('Error in deleteVisitTemplate:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// =============================================
// Create Template Visit
// =============================================

export async function createTemplateVisit(
  companyId: string,
  data: CreateTemplateVisitData
) {
  const supabase = await createClient();

  try {
    const insertData = {
      company_id: companyId,
      ...data,
      day_from_baseline: data.day_from_baseline || 0,
      visit_window_before: data.visit_window_before || 0,
      visit_window_after: data.visit_window_after || 0,
      description: data.description || null,
      metadata: data.metadata || {},
    };

    const { data: visit, error } = await supabase
      .from('template_visits')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating template visit:', error);
      return {
        success: false,
        error: 'Failed to create template visit',
        data: null,
      };
    }

    revalidatePath('/protected/clinical-trials');
    return {
      success: true,
      data: visit,
      error: null,
    };
  } catch (error) {
    console.error('Error in createTemplateVisit:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Update Template Visit
// =============================================

export async function updateTemplateVisit(
  companyId: string,
  updateData: UpdateTemplateVisitData
) {
  const supabase = await createClient();

  try {
    const { id, ...rest } = updateData;

    const { data, error } = await supabase
      .from('template_visits')
      .update(rest)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating template visit:', error);
      return {
        success: false,
        error: 'Failed to update template visit',
        data: null,
      };
    }

    revalidatePath('/protected/clinical-trials');
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error in updateTemplateVisit:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Delete Template Visit
// =============================================

export async function deleteTemplateVisit(companyId: string, id: string) {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('template_visits')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error deleting template visit:', error);
      return {
        success: false,
        error: 'Failed to delete template visit',
      };
    }

    revalidatePath('/protected/clinical-trials');
    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error('Error in deleteTemplateVisit:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// =============================================
// Create Template Activity
// =============================================

export async function createTemplateActivity(
  companyId: string,
  data: CreateTemplateActivityData
) {
  const supabase = await createClient();

  try {
    const insertData = {
      company_id: companyId,
      ...data,
      activity_type: data.activity_type || null,
      is_required: data.is_required !== undefined ? data.is_required : true,
      description: data.description || null,
      metadata: data.metadata || {},
    };

    const { data: activity, error } = await supabase
      .from('template_activities')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating template activity:', error);
      return {
        success: false,
        error: 'Failed to create template activity',
        data: null,
      };
    }

    revalidatePath('/protected/clinical-trials');
    return {
      success: true,
      data: activity,
      error: null,
    };
  } catch (error) {
    console.error('Error in createTemplateActivity:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Update Template Activity
// =============================================

export async function updateTemplateActivity(
  companyId: string,
  updateData: UpdateTemplateActivityData
) {
  const supabase = await createClient();

  try {
    const { id, ...rest } = updateData;

    const { data, error } = await supabase
      .from('template_activities')
      .update(rest)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating template activity:', error);
      return {
        success: false,
        error: 'Failed to update template activity',
        data: null,
      };
    }

    revalidatePath('/protected/clinical-trials');
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error in updateTemplateActivity:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Delete Template Activity
// =============================================

export async function deleteTemplateActivity(companyId: string, id: string) {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('template_activities')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error deleting template activity:', error);
      return {
        success: false,
        error: 'Failed to delete template activity',
      };
    }

    revalidatePath('/protected/clinical-trials');
    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error('Error in deleteTemplateActivity:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}
