'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import {
  Contact,
  ContactWithRelations,
  CreateContactData,
  UpdateContactData,
  ContactFilters,
  AssignContactToOrganizationData,
  AssignContactToProjectData,
} from '@/lib/types/contacts-organizations';
import { logContactActivity, generateContactUpdateDescription } from '@/lib/utils/activity-logger';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// =============================================
// GET CONTACTS (with pagination and filtering)
// =============================================

export async function getContacts(
  companyId: string,
  filters: ContactFilters = {}
): Promise<ActionResponse<{ contacts: ContactWithRelations[]; total: number }>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { search, title, status, organization_id, page = 1, pageSize = 25 } = filters;
    const offset = (page - 1) * pageSize;

    // Build the query
    let query = supabase
      .from('contacts')
      .select(`
        *,
        organization_contacts(
          id,
          organization:organizations(id, name, organization_type)
        ),
        contact_projects(id)
      `, { count: 'exact' })
      .eq('company_id', companyId)
      .order('last_name', { ascending: true });

    // Apply filters
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (title) {
      query = query.ilike('title', `%${title}%`);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching contacts:', error);
      return { success: false, error: error.message };
    }

    // Transform the data to include counts and primary organization
    let contacts = (data || []).map((contact: any) => {
      const orgRelations = contact.organization_contacts || [];
      const projectRelations = contact.contact_projects || [];
      const primaryOrgRelation = orgRelations.find((oc: any) => oc.is_primary);

      return {
        ...contact,
        organizations: orgRelations,
        projects: projectRelations,
        addresses: [],
        primary_organization: primaryOrgRelation?.organization || null,
        organizations_count: orgRelations.length,
        projects_count: projectRelations.length,
      };
    });

    // Filter by organization_id on the client side (since it's a nested relationship)
    if (organization_id && organization_id !== 'all') {
      contacts = contacts.filter((contact: any) =>
        contact.organization_contacts?.some((oc: any) => oc.organization?.id === organization_id)
      );
    }

    return {
      success: true,
      data: { contacts, total: count || 0 },
    };
  } catch (error) {
    console.error('Error in getContacts:', error);
    return { success: false, error: 'Failed to fetch contacts' };
  }
}

// =============================================
// GET ALL CONTACTS (without pagination)
// =============================================

export async function getAllContacts(companyId: string): Promise<ActionResponse<Contact[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('last_name', { ascending: true });

    if (error) {
      console.error('Error fetching all contacts:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getAllContacts:', error);
    return { success: false, error: 'Failed to fetch contacts' };
  }
}

// =============================================
// GET SINGLE CONTACT
// =============================================

export async function getContact(contactId: string): Promise<ActionResponse<ContactWithRelations>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('contacts')
      .select(`
        *,
        organization_contacts(
          *,
          organization:organizations(*)
        ),
        contact_projects(
          *,
          project:projects(id, protocol_number, protocol_name, protocol_status),
          organization:organizations(id, name)
        )
      `)
      .eq('id', contactId)
      .single();

    if (error) {
      console.error('Error fetching contact:', error);
      return { success: false, error: error.message };
    }

    // Fetch addresses separately (polymorphic relationship)
    const { data: addresses } = await supabase
      .from('addresses')
      .select('*')
      .eq('entity_type', 'contact')
      .eq('entity_id', contactId);

    // Get primary organization
    const primaryOrgRelation = data.organization_contacts?.find(
      (oc: any) => oc.is_primary
    );

    const contact: ContactWithRelations = {
      ...data,
      organizations: data.organization_contacts,
      projects: data.contact_projects,
      addresses: addresses || [],
      primary_organization: primaryOrgRelation?.organization || null,
      organizations_count: data.organization_contacts?.length || 0,
      projects_count: data.contact_projects?.length || 0,
    };

    return { success: true, data: contact };
  } catch (error) {
    console.error('Error in getContact:', error);
    return { success: false, error: 'Failed to fetch contact' };
  }
}

// =============================================
// CREATE CONTACT
// =============================================

export async function createContact(
  companyId: string,
  profileId: string,
  creatorEmail: string,
  data: CreateContactData
): Promise<ActionResponse<Contact>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        company_id: companyId,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || null,
        phone: data.phone || null,
        title: data.title || null,
        credentials: data.credentials || null,
        license_number: data.license_number || null,
        primary_specialty: data.primary_specialty || null,
        profile_image_url: data.profile_image_url || null,
        status: data.status || 'active',
        notes: data.notes || null,
        metadata: data.metadata || {},
        created_by_id: profileId,
        creator_email: creatorEmail,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating contact:', error);
      return { success: false, error: error.message };
    }

    // Log activity
    await logContactActivity({
      entityId: contact.id,
      activityType: 'created',
      description: `Created contact "${data.first_name} ${data.last_name}"`,
      performedById: profileId,
      performerEmail: creatorEmail,
    });

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: contact };
  } catch (error) {
    console.error('Error in createContact:', error);
    return { success: false, error: 'Failed to create contact' };
  }
}

// =============================================
// UPDATE CONTACT
// =============================================

export async function updateContact(
  data: UpdateContactData
): Promise<ActionResponse<Contact>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get profile info for activity logging
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('user_id', user.id)
      .single();

    const { id, ...updateData } = data;

    // Fetch old data for comparison
    const { data: oldContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();

    const { data: contact, error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contact:', error);
      return { success: false, error: error.message };
    }

    // Track changed fields
    const changedFields: Record<string, { old: any; new: any }> = {};
    if (oldContact) {
      Object.keys(updateData).forEach((key) => {
        const typedKey = key as keyof typeof updateData;
        if ((oldContact as any)[key] !== updateData[typedKey]) {
          changedFields[key] = { old: (oldContact as any)[key], new: updateData[typedKey] };
        }
      });
    }

    // Log activity
    if (Object.keys(changedFields).length > 0) {
      const description = generateContactUpdateDescription(changedFields);
      await logContactActivity({
        entityId: id,
        activityType: changedFields.status ? 'status_changed' : 'updated',
        description,
        changedFields,
        performedById: profile?.id,
        performerEmail: profile?.email || user.email,
      });
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: contact };
  } catch (error) {
    console.error('Error in updateContact:', error);
    return { success: false, error: 'Failed to update contact' };
  }
}

// =============================================
// DELETE CONTACT (soft delete)
// =============================================

export async function deleteContact(
  contactId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get profile info for activity logging
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('user_id', user.id)
      .single();

    // Get contact name for activity log
    const { data: contact } = await supabase
      .from('contacts')
      .select('first_name, last_name')
      .eq('id', contactId)
      .single();

    // Soft delete by setting status to inactive
    const { error } = await supabase
      .from('contacts')
      .update({ status: 'inactive' })
      .eq('id', contactId);

    if (error) {
      console.error('Error deleting contact:', error);
      return { success: false, error: error.message };
    }

    // Log activity
    await logContactActivity({
      entityId: contactId,
      activityType: 'deleted',
      description: `Deleted contact "${contact?.first_name} ${contact?.last_name}"`,
      performedById: profile?.id,
      performerEmail: profile?.email || user.email,
    });

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in deleteContact:', error);
    return { success: false, error: 'Failed to delete contact' };
  }
}

// =============================================
// ASSIGN CONTACT TO ORGANIZATION
// =============================================

export async function assignContactToOrganization(
  data: AssignContactToOrganizationData
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // If this is set as primary, unset any existing primary for this contact
    if (data.is_primary) {
      await supabase
        .from('organization_contacts')
        .update({ is_primary: false })
        .eq('contact_id', data.contact_id)
        .eq('is_primary', true);
    }

    const { error } = await supabase
      .from('organization_contacts')
      .insert({
        contact_id: data.contact_id,
        organization_id: data.organization_id,
        role: data.role,
        is_primary: data.is_primary,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        status: data.status,
      });

    if (error) {
      console.error('Error assigning contact to organization:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in assignContactToOrganization:', error);
    return { success: false, error: 'Failed to assign contact' };
  }
}

// =============================================
// ARCHIVE CONTACT FROM ORGANIZATION
// =============================================

export async function archiveOrganizationContact(
  organizationContactId: string,
  archiveDate: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('organization_contacts')
      .update({
        end_date: archiveDate,
        status: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationContactId);

    if (error) {
      console.error('Error archiving organization contact:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in archiveOrganizationContact:', error);
    return { success: false, error: 'Failed to archive contact' };
  }
}

// =============================================
// REMOVE CONTACT FROM ORGANIZATION
// =============================================

export async function removeContactFromOrganization(
  relationshipId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('organization_contacts')
      .delete()
      .eq('id', relationshipId);

    if (error) {
      console.error('Error removing contact from organization:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in removeContactFromOrganization:', error);
    return { success: false, error: 'Failed to remove contact' };
  }
}

// =============================================
// ASSIGN CONTACT TO PROJECT
// =============================================

export async function assignContactToProject(
  data: AssignContactToProjectData
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('contact_projects')
      .insert({
        contact_id: data.contact_id,
        project_id: data.project_id,
        organization_id: data.organization_id || null,
        role: data.role,
        status: data.status,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
      });

    if (error) {
      console.error('Error assigning contact to project:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in assignContactToProject:', error);
    return { success: false, error: 'Failed to assign contact to project' };
  }
}

// =============================================
// REMOVE CONTACT FROM PROJECT
// =============================================

export async function removeContactFromProject(
  relationshipId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('contact_projects')
      .delete()
      .eq('id', relationshipId);

    if (error) {
      console.error('Error removing contact from project:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in removeContactFromProject:', error);
    return { success: false, error: 'Failed to remove contact from project' };
  }
}
