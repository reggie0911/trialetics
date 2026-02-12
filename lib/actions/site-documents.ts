'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type { SiteDocument, SiteDocumentType, SiteDocumentStatus } from '@/lib/types/contacts-organizations';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function getSiteDocuments(
  organizationId: string
): Promise<ActionResponse<SiteDocument[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('site_documents')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching site documents:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getSiteDocuments:', error);
    return { success: false, error: 'Failed to fetch site documents' };
  }
}

export async function createSiteDocument(
  organizationId: string,
  data: {
    document_name: string;
    document_type: SiteDocumentType;
    sent_date?: string | null;
    expected_date?: string | null;
    received_date?: string | null;
    expiration_date?: string | null;
    project_id?: string | null;
    status?: SiteDocumentStatus;
    file_url?: string | null;
    notes?: string | null;
  }
): Promise<ActionResponse<SiteDocument>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: doc, error } = await supabase
      .from('site_documents')
      .insert({
        organization_id: organizationId,
        document_name: data.document_name,
        document_type: data.document_type,
        sent_date: data.sent_date ?? null,
        expected_date: data.expected_date ?? null,
        received_date: data.received_date ?? null,
        expiration_date: data.expiration_date ?? null,
        project_id: data.project_id ?? null,
        status: data.status ?? 'pending',
        file_url: data.file_url ?? null,
        notes: data.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating site document:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/protected/contacts-organizations/${organizationId}`);
    return { success: true, data: doc };
  } catch (error) {
    console.error('Error in createSiteDocument:', error);
    return { success: false, error: 'Failed to create site document' };
  }
}

export async function updateSiteDocument(
  documentId: string,
  data: {
    document_name?: string;
    document_type?: SiteDocumentType;
    sent_date?: string | null;
    expected_date?: string | null;
    received_date?: string | null;
    expiration_date?: string | null;
    project_id?: string | null;
    status?: SiteDocumentStatus;
    file_url?: string | null;
    notes?: string | null;
  }
): Promise<ActionResponse<SiteDocument>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: doc, error } = await supabase
      .from('site_documents')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating site document:', error);
      return { success: false, error: error.message };
    }

    if (doc) {
      revalidatePath(`/protected/contacts-organizations/${doc.organization_id}`);
    }
    return { success: true, data: doc };
  } catch (error) {
    console.error('Error in updateSiteDocument:', error);
    return { success: false, error: 'Failed to update site document' };
  }
}

export async function deleteSiteDocument(documentId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: doc } = await supabase
      .from('site_documents')
      .select('organization_id')
      .eq('id', documentId)
      .single();

    const { error } = await supabase
      .from('site_documents')
      .delete()
      .eq('id', documentId);

    if (error) {
      console.error('Error deleting site document:', error);
      return { success: false, error: error.message };
    }

    if (doc?.organization_id) {
      revalidatePath(`/protected/contacts-organizations/${doc.organization_id}`);
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in deleteSiteDocument:', error);
    return { success: false, error: 'Failed to delete site document' };
  }
}
