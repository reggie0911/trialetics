'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';

export type ProtocolContactRole =
  | 'principal_investigator'
  | 'sub_investigator'
  | 'coordinator'
  | 'site_staff'
  | 'sponsor_rep'
  | 'cro_rep'
  | 'medical_monitor'
  | 'project_manager'
  | 'data_manager'
  | 'regulatory_lead'
  | 'qa_lead'
  | 'lab_director'
  | 'finance'
  | 'contracts'
  | 'other';

export type ProtocolContactStatus = 'active' | 'inactive' | 'pending';

export interface ProtocolContact {
  id: string;
  company_id: string;
  protocol_id: string;
  contact_id: string;
  organization_id: string | null;
  clinical_site_id: string | null;
  role: ProtocolContactRole;
  status: ProtocolContactStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProtocolContactWithRelations extends ProtocolContact {
  contact?: { id: string; first_name: string; last_name: string; email: string | null; title: string | null };
  organization?: { id: string; name: string } | null;
  clinical_site?: { id: string; site_number: string } | null;
}

export interface CreateProtocolContactInput {
  protocol_id: string;
  contact_id: string;
  organization_id?: string | null;
  clinical_site_id?: string | null;
  role: ProtocolContactRole;
  status?: ProtocolContactStatus;
  start_date?: string | null;
  end_date?: string | null;
}

export interface UpdateProtocolContactInput {
  organization_id?: string | null;
  clinical_site_id?: string | null;
  role?: ProtocolContactRole;
  status?: ProtocolContactStatus;
  start_date?: string | null;
  end_date?: string | null;
}

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getProtocolContacts(
  protocolId: string,
  clinicalSiteId?: string | null
): Promise<ActionResponse<ProtocolContactWithRelations[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('protocol_contacts')
      .select(`
        *,
        contact:contacts(id, first_name, last_name, email, title),
        organization:organizations(id, name),
        clinical_site:clinical_sites(id, site_number)
      `)
      .eq('protocol_id', protocolId)
      .order('role', { ascending: true });

    if (clinicalSiteId) {
      query = query.or(`clinical_site_id.eq.${clinicalSiteId},clinical_site_id.is.null`);
    }

    const { data, error } = await query;

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as ProtocolContactWithRelations[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createProtocolContact(
  input: CreateProtocolContactInput
): Promise<ActionResponse<ProtocolContact>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('protocol_contacts')
      .insert({
        company_id: profile.company_id,
        protocol_id: input.protocol_id,
        contact_id: input.contact_id,
        organization_id: input.organization_id ?? null,
        clinical_site_id: input.clinical_site_id ?? null,
        role: input.role,
        status: input.status ?? 'active',
        start_date: input.start_date ?? null,
        end_date: input.end_date ?? null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as ProtocolContact };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateProtocolContact(
  contactId: string,
  input: UpdateProtocolContactInput
): Promise<ActionResponse<ProtocolContact>> {
  try {
    const supabase = await createClient();
    const updateData: Record<string, unknown> = {};
    if (input.organization_id !== undefined) updateData.organization_id = input.organization_id;
    if (input.clinical_site_id !== undefined) updateData.clinical_site_id = input.clinical_site_id;
    if (input.role !== undefined) updateData.role = input.role;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.start_date !== undefined) updateData.start_date = input.start_date;
    if (input.end_date !== undefined) updateData.end_date = input.end_date;

    const { data, error } = await supabase
      .from('protocol_contacts')
      .update(updateData)
      .eq('id', contactId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as ProtocolContact };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteProtocolContact(contactId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('protocol_contacts').delete().eq('id', contactId);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
