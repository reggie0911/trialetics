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
import { CONTACT_ROLE_LABELS } from '@/lib/types/contacts-organizations';
import { getContactDisplayTitle } from '@/lib/utils/contact-title-mapping';

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
        protocol_contacts(id),
        contact_role_assignments(id, role_id, is_primary, role:ctms_roles(id, slug, name, category))
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
      const projectRelations = contact.protocol_contacts || [];
      const primaryOrgRelation = orgRelations.find((oc: any) => oc.is_primary) || orgRelations[0];
      const roleAssignments = contact.contact_role_assignments || [];

      return {
        ...contact,
        organizations: orgRelations,
        projects: projectRelations,
        addresses: [],
        primary_organization: primaryOrgRelation?.organization || null,
        organizations_count: orgRelations.length,
        projects_count: projectRelations.length,
        roleAssignments,
        displayTitle: getContactDisplayTitle(roleAssignments, contact.title, CONTACT_ROLE_LABELS),
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
        protocol_contacts(
          *,
          protocol:clinical_protocols(id, protocol_number, title, status),
          organization:organizations(id, name)
        ),
        contact_role_assignments(id, role_id, is_primary, role:ctms_roles(id, slug, name, category))
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

    // Get primary organization (fall back to first if none marked primary)
    const primaryOrgRelation = data.organization_contacts?.find(
      (oc: any) => oc.is_primary
    ) || data.organization_contacts?.[0];

    // Fetch addresses for all organizations in the contact's org list
    const orgIds = (data.organization_contacts || [])
      .map((oc: any) => oc.organization?.id)
      .filter(Boolean);
    let orgAddressMap: Record<string, any> = {};
    if (orgIds.length > 0) {
      const { data: orgAddresses } = await supabase
        .from('addresses')
        .select('*')
        .eq('entity_type', 'organization')
        .in('entity_id', orgIds)
        .order('is_primary', { ascending: false });
      // Group by entity_id, keep primary (or first) per org
      for (const addr of orgAddresses || []) {
        const eid = addr.entity_id;
        if (!orgAddressMap[eid]) orgAddressMap[eid] = addr;
      }
    }

    const primaryOrgAddress = primaryOrgRelation?.organization?.id
      ? orgAddressMap[primaryOrgRelation.organization.id] || null
      : null;

    const primaryOrg = primaryOrgRelation?.organization
      ? { ...primaryOrgRelation.organization, primary_address: primaryOrgAddress }
      : null;

    // Attach primary_address to each organization in the list
    const organizationsWithAddress = (data.organization_contacts || []).map((oc: any) => {
      const addr = oc.organization?.id ? orgAddressMap[oc.organization.id] : null;
      return {
        ...oc,
        organization: oc.organization
          ? { ...oc.organization, primary_address: addr }
          : oc.organization,
      };
    });

    const roleAssignments = data.contact_role_assignments || [];

    const contact: ContactWithRelations = {
      ...data,
      organizations: organizationsWithAddress,
      projects: data.protocol_contacts,
      addresses: addresses || [],
      primary_organization: primaryOrg,
      organizations_count: data.organization_contacts?.length || 0,
      projects_count: data.protocol_contacts?.length || 0,
      roleAssignments,
      displayTitle: getContactDisplayTitle(roleAssignments, data.title, CONTACT_ROLE_LABELS),
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
        title: null,
        contact_type: data.contact_type || null,
        salutation: data.salutation || null,
        middle_initial: data.middle_initial || null,
        mobile_phone: data.mobile_phone || null,
        home_phone: data.home_phone || null,
        credentials: data.credentials || null,
        license_number: data.license_number || null,
        primary_specialty: data.primary_specialty || null,
        profile_image_url: data.profile_image_url || null,
        is_disqualified: data.is_disqualified || false,
        disqualification_reason: data.disqualification_reason || null,
        therapeutic_qualifications: data.therapeutic_qualifications || [],
        specialties: data.specialties || [],
        sub_specialties: data.sub_specialties || [],
        professional_associations: data.professional_associations ?? [],
        status: data.status || 'active',
        notes: data.notes || null,
        manager_id: data.manager_id ?? null,
        youtube_url: data.youtube_url || null,
        linkedin_url: data.linkedin_url || null,
        x_url: data.x_url || null,
        facebook_url: data.facebook_url || null,
        substack_url: data.substack_url || null,
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

    // Auto-set inactive_date based on status transition
    if (updateData.status === 'inactive' && oldContact?.status !== 'inactive') {
      updateData.inactive_date = new Date().toISOString();
    } else if (updateData.status === 'active' && oldContact?.status === 'inactive') {
      updateData.inactive_date = null;
    }

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
// SET PRIMARY ROLE CONTACT (for site primary roles: PI, Research Director, Clinical Monitor)
// =============================================

export type PrimaryRoleType = 'principal_investigator' | 'coordinator' | 'site_staff';

export async function setPrimaryRoleContact(
  organizationId: string,
  role: PrimaryRoleType,
  contactId: string | null
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Find existing row with this org + role
    const { data: existingRows } = await supabase
      .from('organization_contacts')
      .select('id, contact_id')
      .eq('organization_id', organizationId)
      .eq('role', role)
      .limit(1);

    const existing = existingRows?.[0];

    if (!contactId) {
      // Clear: delete existing if any
      if (existing) {
        const { error: delError } = await supabase
          .from('organization_contacts')
          .delete()
          .eq('id', existing.id);
        if (delError) {
          console.error('Error clearing primary role:', delError);
          return { success: false, error: delError.message };
        }
      }
      revalidatePath('/protected/contacts-organizations');
      return { success: true, data: null };
    }

    // Check if contact is already at this org (any role)
    const { data: contactAtOrg } = await supabase
      .from('organization_contacts')
      .select('id, role')
      .eq('organization_id', organizationId)
      .eq('contact_id', contactId)
      .single();

    if (contactAtOrg) {
      // Contact already at org: update their role in place
      if (contactAtOrg.role === role) {
        // Same role, no-op
        revalidatePath('/protected/contacts-organizations');
        return { success: true, data: null };
      }
      const { error: updateError } = await supabase
        .from('organization_contacts')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', contactAtOrg.id);
      if (updateError) {
        console.error('Error updating primary role:', updateError);
        return { success: false, error: updateError.message };
      }
      // Remove old role holder if different contact
      if (existing && existing.contact_id !== contactId) {
        await supabase.from('organization_contacts').delete().eq('id', existing.id);
      }
    } else {
      // Contact not at org: delete old holder (if any), insert new
      if (existing) {
        await supabase.from('organization_contacts').delete().eq('id', existing.id);
      }
      const { error: insertError } = await supabase.from('organization_contacts').insert({
        organization_id: organizationId,
        contact_id: contactId,
        role,
        is_primary: false,
        status: 'active',
      });
      if (insertError) {
        console.error('Error assigning primary role:', insertError);
        return { success: false, error: insertError.message };
      }
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in setPrimaryRoleContact:', error);
    return { success: false, error: 'Failed to set primary role contact' };
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

    // Get company_id from the contact
    const { data: contact } = await supabase
      .from('contacts')
      .select('company_id')
      .eq('id', data.contact_id)
      .single();

    if (!contact) {
      return { success: false, error: 'Contact not found' };
    }

    const { error } = await supabase
      .from('protocol_contacts')
      .insert({
        company_id: contact.company_id,
        contact_id: data.contact_id,
        protocol_id: data.protocol_id,
        organization_id: data.organization_id || null,
        role: data.role,
        status: data.status,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        country: data.country || null,
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
      .from('protocol_contacts')
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

// =============================================
// CHECK FOR DUPLICATE CONTACTS
// =============================================

export async function checkDuplicateContacts(
  companyId: string,
  firstName: string,
  lastName: string,
  email?: string | null
): Promise<ActionResponse<{ duplicates: Array<{ id: string; first_name: string; last_name: string; email: string | null }> }>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('contacts')
      .select('id, first_name, last_name, email')
      .eq('company_id', companyId)
      .ilike('first_name', firstName.trim())
      .ilike('last_name', lastName.trim())
      .limit(5);

    const { data: nameMatches } = await query;

    let emailMatches: typeof nameMatches = [];
    if (email && email.trim()) {
      const { data: em } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email')
        .eq('company_id', companyId)
        .ilike('email', email.trim())
        .limit(5);
      emailMatches = em || [];
    }

    const seen = new Set<string>();
    const duplicates: Array<{ id: string; first_name: string; last_name: string; email: string | null }> = [];
    for (const d of [...(nameMatches || []), ...(emailMatches || [])]) {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        duplicates.push(d);
      }
    }

    return { success: true, data: { duplicates } };
  } catch (error) {
    console.error('Error checking duplicate contacts:', error);
    return { success: false, error: 'Failed to check duplicates' };
  }
}
