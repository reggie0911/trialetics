'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type { SiteVisit, SiteVisitType, SiteVisitStatus } from '@/lib/types/contacts-organizations';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function getSiteVisit(
  siteVisitId: string
): Promise<ActionResponse<SiteVisit & { organization_id: string }>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('site_visits')
      .select('*')
      .eq('id', siteVisitId)
      .single();

    if (error) {
      console.error('Error fetching site visit:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as SiteVisit & { organization_id: string } };
  } catch (error) {
    console.error('Error in getSiteVisit:', error);
    return { success: false, error: 'Failed to fetch site visit' };
  }
}

export async function getSiteVisits(
  organizationId: string
): Promise<ActionResponse<Array<SiteVisit & { assigned_to?: { id: string; first_name: string | null; email: string | null } | null; protocol?: { id: string; protocol_number: string; title: string } | null }>>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('site_visits')
      .select('*')
      .eq('organization_id', organizationId)
      .order('visit_start', { ascending: false });

    if (error) {
      console.error('Error fetching site visits:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getSiteVisits:', error);
    return { success: false, error: 'Failed to fetch site visits' };
  }
}

export async function createSiteVisit(
  organizationId: string,
  data: {
    visit_name: string;
    visit_type: SiteVisitType;
    visit_start: string;
    visit_status?: SiteVisitStatus;
    protocol_id?: string | null;
    assigned_to_id?: string | null;
    notes?: string | null;
  }
): Promise<ActionResponse<SiteVisit>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: visit, error } = await supabase
      .from('site_visits')
      .insert({
        organization_id: organizationId,
        visit_name: data.visit_name,
        visit_type: data.visit_type,
        visit_start: data.visit_start,
        visit_status: data.visit_status || 'planned',
        protocol_id: data.protocol_id || null,
        assigned_to_id: data.assigned_to_id || null,
        notes: data.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating site visit:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/protected/contacts-organizations/${organizationId}`);
    return { success: true, data: visit };
  } catch (error) {
    console.error('Error in createSiteVisit:', error);
    return { success: false, error: 'Failed to create site visit' };
  }
}

export async function updateSiteVisit(
  visitId: string,
  data: {
    visit_name?: string;
    visit_type?: SiteVisitType;
    visit_start?: string;
    visit_status?: SiteVisitStatus;
    protocol_id?: string | null;
    assigned_to_id?: string | null;
    notes?: string | null;
  }
): Promise<ActionResponse<SiteVisit>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: visit, error } = await supabase
      .from('site_visits')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', visitId)
      .select()
      .single();

    if (error) {
      console.error('Error updating site visit:', error);
      return { success: false, error: error.message };
    }

    if (visit) {
      revalidatePath(`/protected/contacts-organizations/${visit.organization_id}`);
    }
    return { success: true, data: visit };
  } catch (error) {
    console.error('Error in updateSiteVisit:', error);
    return { success: false, error: 'Failed to update site visit' };
  }
}

export async function getProfilesForCompany(
  companyId: string
): Promise<ActionResponse<Array<{ id: string; first_name: string | null; email: string | null }>>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, email')
      .eq('company_id', companyId)
      .order('first_name', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: 'Failed to fetch profiles' };
  }
}

export async function deleteSiteVisit(visitId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: visit } = await supabase
      .from('site_visits')
      .select('organization_id')
      .eq('id', visitId)
      .single();

    const { error } = await supabase
      .from('site_visits')
      .delete()
      .eq('id', visitId);

    if (error) {
      console.error('Error deleting site visit:', error);
      return { success: false, error: error.message };
    }

    if (visit?.organization_id) {
      revalidatePath(`/protected/contacts-organizations/${visit.organization_id}`);
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in deleteSiteVisit:', error);
    return { success: false, error: 'Failed to delete site visit' };
  }
}
