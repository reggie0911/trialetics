'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import {
  Organization,
  OrganizationWithRelations,
  CreateOrganizationData,
  UpdateOrganizationData,
  OrganizationFilters,
  AssignOrganizationToProjectData,
  ContactsOrganizationsStats,
  OrganizationType,
  Address,
} from '@/lib/types/contacts-organizations';
import { logOrganizationActivity, generateOrganizationUpdateDescription } from '@/lib/utils/activity-logger';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// =============================================
// GET ORGANIZATIONS (with pagination and filtering)
// =============================================

export async function getOrganizations(
  companyId: string,
  filters: OrganizationFilters = {}
): Promise<ActionResponse<{ organizations: OrganizationWithRelations[]; total: number; distinctSiteIds: string[] }>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { search, name, organization_type, status, site_id, state, country, page = 1, pageSize = 25 } = filters;
    const offset = (page - 1) * pageSize;

    // If filtering by state or country, we need to get organization IDs from addresses first
    let organizationIds: string[] | null = null;
    if (state && state !== 'all') {
      const { data: addressData } = await supabase
        .from('addresses')
        .select('entity_id')
        .eq('entity_type', 'organization')
        .ilike('state', `%${state}%`);
      organizationIds = addressData?.map((a) => a.entity_id) || [];
    }
    if (country && country !== 'all') {
      const { data: addressData } = await supabase
        .from('addresses')
        .select('entity_id')
        .eq('entity_type', 'organization')
        .ilike('country', `%${country}%`);
      const countryOrgIds = addressData?.map((a) => a.entity_id) || [];
      // If we already have state filter, intersect the arrays
      if (organizationIds) {
        organizationIds = organizationIds.filter((id) => countryOrgIds.includes(id));
      } else {
        organizationIds = countryOrgIds;
      }
    }

    // Build the query
    let query = supabase
      .from('organizations')
      .select(`
        *,
        organization_contacts(id),
        organization_protocols(id)
      `, { count: 'exact' })
      .eq('company_id', companyId)
      .order('name', { ascending: true });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (name) {
      query = query.ilike('name', `%${name}%`);
    }

    if (organization_type && organization_type !== 'all') {
      query = query.eq('organization_type', organization_type);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (site_id && site_id !== 'all') {
      query = query.eq('site_id', site_id);
    }

    // Apply address-based filters
    if (organizationIds !== null) {
      if (organizationIds.length === 0) {
        // No organizations match the address filter
        return {
          success: true,
          data: {
            organizations: [],
            total: 0,
            distinctSiteIds: [],
          },
        };
      }
      query = query.in('id', organizationIds);
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching organizations:', error);
      return { success: false, error: error.message };
    }

    // Fetch distinct site_ids for filter dropdown (site-type orgs only)
    const { data: siteIdsData } = await supabase
      .from('organizations')
      .select('site_id')
      .eq('company_id', companyId)
      .eq('organization_type', 'site')
      .not('site_id', 'is', null);
    const distinctSiteIds = [...new Set((siteIdsData || []).map((r: { site_id: string }) => r.site_id).filter(Boolean))].sort();

    // Fetch addresses for all organizations
    const orgIds = (data || []).map((org: any) => org.id);
    const { data: addressesData } = await supabase
      .from('addresses')
      .select('*')
      .eq('entity_type', 'organization')
      .in('entity_id', orgIds);

    // Group addresses by organization ID
    const addressesByOrgId = (addressesData || []).reduce((acc: Record<string, any[]>, addr: any) => {
      if (!acc[addr.entity_id]) {
        acc[addr.entity_id] = [];
      }
      acc[addr.entity_id].push(addr);
      return acc;
    }, {});

    // Transform the data to include counts and addresses
    const organizations = (data || []).map((org: any) => ({
      ...org,
      contacts_count: org.organization_contacts?.length || 0,
      projects_count: org.organization_protocols?.length || 0,
      addresses: addressesByOrgId[org.id] || [],
    }));

    return {
      success: true,
      data: {
        organizations,
        total: count || 0,
        distinctSiteIds,
      },
    };
  } catch (error) {
    console.error('Error in getOrganizations:', error);
    return { success: false, error: 'Failed to fetch organizations' };
  }
}

// =============================================
// GET SINGLE ORGANIZATION (with relations)
// =============================================

export async function getOrganization(
  organizationId: string
): Promise<ActionResponse<OrganizationWithRelations>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('organizations')
      .select(`
        *,
        organization_contacts(
          *,
          contact:contacts(*)
        ),
        organization_protocols(
          *,
          protocol:clinical_protocols(id, protocol_number, title, status)
        )
      `)
      .eq('id', organizationId)
      .single();

    if (error) {
      console.error('Error fetching organization:', error);
      return { success: false, error: error.message };
    }

    // Fetch addresses separately (polymorphic relationship)
    const { data: addresses } = await supabase
      .from('addresses')
      .select('*')
      .eq('entity_type', 'organization')
      .eq('entity_id', organizationId);

    // Get primary contact
    const primaryContactRelation = data.organization_contacts?.find(
      (oc: any) => oc.is_primary
    );

    const organization: OrganizationWithRelations = {
      ...data,
      contacts: data.organization_contacts,
      projects: data.organization_protocols,
      addresses: addresses || [],
      primary_contact: primaryContactRelation?.contact || null,
      contacts_count: data.organization_contacts?.length || 0,
      projects_count: data.organization_protocols?.length || 0,
    };

    return { success: true, data: organization };
  } catch (error) {
    console.error('Error in getOrganization:', error);
    return { success: false, error: 'Failed to fetch organization' };
  }
}

// =============================================
// GET ORGANIZATION STATUS HISTORY
// =============================================

export async function getOrganizationStatusHistory(
  organizationId: string
): Promise<{ success: boolean; data?: Array<{ id: string; old_status: string; new_status: string; changed_at: string; changed_by_email: string | null }>; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('organization_status_history')
      .select('id, old_status, new_status, changed_at, changed_by_email')
      .eq('organization_id', organizationId)
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('Error fetching organization status history:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getOrganizationStatusHistory:', error);
    return { success: false, error: 'Failed to fetch status history' };
  }
}

// =============================================
// SATELLITE SITES (Phase 6)
// =============================================

export async function getSiteOrganizationsForCompany(
  companyId: string
): Promise<ActionResponse<Array<{ id: string; name: string }>>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('company_id', companyId)
      .eq('organization_type', 'site')
      .order('name', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getSiteOrganizationsForCompany:', error);
    return { success: false, error: 'Failed to fetch sites' };
  }
}

export async function getSatelliteSites(
  parentOrganizationId: string
): Promise<ActionResponse<Array<{ id: string; name: string; status: string; organization_type: string }>>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, status, organization_type')
      .eq('parent_organization_id', parentOrganizationId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching satellite sites:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getSatelliteSites:', error);
    return { success: false, error: 'Failed to fetch satellite sites' };
  }
}

export async function getParentSite(
  organizationId: string
): Promise<ActionResponse<{ id: string; name: string; status: string } | null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('parent_organization_id')
      .eq('id', organizationId)
      .single();

    if (!org?.parent_organization_id) {
      return { success: true, data: null };
    }

    const { data: parent, error } = await supabase
      .from('organizations')
      .select('id, name, status')
      .eq('id', org.parent_organization_id)
      .single();

    if (error || !parent) {
      return { success: true, data: null };
    }

    return { success: true, data: parent };
  } catch (error) {
    console.error('Error in getParentSite:', error);
    return { success: false, error: 'Failed to fetch parent site' };
  }
}

// =============================================
// CREATE ORGANIZATION
// =============================================

export async function createOrganization(
  companyId: string,
  profileId: string,
  creatorEmail: string,
  data: CreateOrganizationData
): Promise<ActionResponse<Organization>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: organization, error } = await supabase
      .from('organizations')
      .insert({
        company_id: companyId,
        name: data.name,
        organization_type: data.organization_type,
        status: data.status || 'active',
        site_id: data.site_id || null,
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        notes: data.notes || null,
        metadata: data.metadata || {},
        created_by_id: profileId,
        creator_email: creatorEmail,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating organization:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: organization };
  } catch (error) {
    console.error('Error in createOrganization:', error);
    return { success: false, error: 'Failed to create organization' };
  }
}

// =============================================
// UPDATE ORGANIZATION
// =============================================

export async function updateOrganization(
  data: UpdateOrganizationData
): Promise<ActionResponse<Organization>> {
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
    const { data: oldOrg } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    const { data: organization, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating organization:', error);
      return { success: false, error: error.message };
    }

    // Track changed fields
    const changedFields: Record<string, { old: any; new: any }> = {};
    if (oldOrg) {
      Object.keys(updateData).forEach((key) => {
        const typedKey = key as keyof typeof updateData;
        if ((oldOrg as any)[key] !== updateData[typedKey]) {
          changedFields[key] = { old: (oldOrg as any)[key], new: updateData[typedKey] };
        }
      });
    }

    // Log activity
    if (Object.keys(changedFields).length > 0) {
      const description = generateOrganizationUpdateDescription(changedFields);
      await logOrganizationActivity({
        entityId: id,
        activityType: changedFields.status ? 'status_changed' : changedFields.organization_type ? 'type_changed' : 'updated',
        description,
        changedFields,
        performedById: profile?.id,
        performerEmail: profile?.email || user.email,
      });
    }

    // Record status change in organization_status_history (Phase 3)
    if (changedFields.status && oldOrg) {
      await supabase
        .from('organization_status_history')
        .insert({
          organization_id: id,
          old_status: String(changedFields.status.old ?? ''),
          new_status: String(changedFields.status.new ?? ''),
          changed_by_id: profile?.id ?? null,
          changed_by_email: profile?.email || user.email || null,
        });
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: organization };
  } catch (error) {
    console.error('Error in updateOrganization:', error);
    return { success: false, error: 'Failed to update organization' };
  }
}

// =============================================
// DELETE ORGANIZATION (soft delete)
// =============================================

export async function deleteOrganization(
  organizationId: string
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

    // Get organization name for activity log
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    // Soft delete by setting status to inactive
    const { error } = await supabase
      .from('organizations')
      .update({ status: 'inactive' })
      .eq('id', organizationId);

    if (error) {
      console.error('Error deleting organization:', error);
      return { success: false, error: error.message };
    }

    // Log activity
    await logOrganizationActivity({
      entityId: organizationId,
      activityType: 'deleted',
      description: `Deleted organization "${org?.name || 'Unknown'}"`,
      performedById: profile?.id,
      performerEmail: profile?.email || user.email,
    });

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in deleteOrganization:', error);
    return { success: false, error: 'Failed to delete organization' };
  }
}

// =============================================
// ASSIGN ORGANIZATION TO PROJECT
// =============================================

export async function assignOrganizationToProject(
  data: AssignOrganizationToProjectData
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('organization_protocols')
      .upsert({
        organization_id: data.organization_id,
        protocol_id: data.protocol_id,
        role: data.role,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        status: 'active',
      }, {
        onConflict: 'organization_id,protocol_id,role',
      });

    if (error) {
      console.error('Error assigning organization to project:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in assignOrganizationToProject:', error);
    return { success: false, error: 'Failed to assign organization to project' };
  }
}

// =============================================
// REMOVE ORGANIZATION FROM PROJECT
// =============================================

export async function removeOrganizationFromProject(
  relationshipId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('organization_protocols')
      .delete()
      .eq('id', relationshipId);

    if (error) {
      console.error('Error removing organization from project:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in removeOrganizationFromProject:', error);
    return { success: false, error: 'Failed to remove organization from project' };
  }
}

// =============================================
// GET ORGANIZATION CONTACTS
// =============================================

export async function getOrganizationContacts(
  organizationId: string
): Promise<ActionResponse<any[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('organization_contacts')
      .select(`
        *,
        contact:contacts(*)
      `)
      .eq('organization_id', organizationId)
      .order('is_primary', { ascending: false });

    if (error) {
      console.error('Error fetching organization contacts:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getOrganizationContacts:', error);
    return { success: false, error: 'Failed to fetch organization contacts' };
  }
}

// =============================================
// GET STATS
// =============================================

export async function getContactsOrganizationsStats(
  companyId: string
): Promise<ActionResponse<ContactsOrganizationsStats>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get organization counts (use count to avoid 1000-row limit)
    const { count: totalOrgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (orgsError) {
      return { success: false, error: orgsError.message };
    }

    const { data: orgs, error: orgsDetailError } = await supabase
      .from('organizations')
      .select('organization_type, status')
      .eq('company_id', companyId)
      .limit(10000);

    if (orgsDetailError) {
      return { success: false, error: orgsDetailError.message };
    }

    // Get contact counts (use count to avoid 1000-row limit)
    const { count: totalContacts, error: contactsCountError } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (contactsCountError) {
      return { success: false, error: contactsCountError.message };
    }

    const { count: activeContactsCount, error: activeContactsError } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'active');

    if (activeContactsError) {
      return { success: false, error: activeContactsError.message };
    }

    // Get investigator counts (contacts assigned as PI or Sub-I)
    const { count: investigatorsCount, error: invError } = await supabase
      .from('organization_contacts')
      .select('*', { count: 'exact', head: true })
      .in('role', ['principal_investigator', 'sub_investigator'])
      .eq('status', 'active');

    if (invError) {
      return { success: false, error: invError.message };
    }

    // Get contact counts by status
    const { count: inactiveContactsCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'inactive');

    const { count: pendingContactsCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'pending');

    // Calculate stats
    const stats: ContactsOrganizationsStats = {
      total_organizations: totalOrgs ?? 0,
      active_organizations: orgs?.filter(o => o.status === 'active').length || 0,
      active_sites: orgs?.filter(o => o.organization_type === 'site' && o.status === 'active').length || 0,
      total_contacts: totalContacts ?? 0,
      active_contacts: activeContactsCount ?? 0,
      active_investigators: investigatorsCount ?? 0,
      organizations_by_type: {
        site: orgs?.filter(o => o.organization_type === 'site').length || 0,
        sponsor: orgs?.filter(o => o.organization_type === 'sponsor').length || 0,
        cro: orgs?.filter(o => o.organization_type === 'cro').length || 0,
        vendor: orgs?.filter(o => o.organization_type === 'vendor').length || 0,
        lab: orgs?.filter(o => o.organization_type === 'lab').length || 0,
        irb: orgs?.filter(o => o.organization_type === 'irb').length || 0,
        regulatory: orgs?.filter(o => o.organization_type === 'regulatory').length || 0,
      },
      contacts_by_status: {
        active: activeContactsCount ?? 0,
        inactive: inactiveContactsCount ?? 0,
        pending: pendingContactsCount ?? 0,
      },
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error in getContactsOrganizationsStats:', error);
    return { success: false, error: 'Failed to fetch stats' };
  }
}

// =============================================
// GET ALL ORGANIZATIONS (for dropdowns)
// =============================================

export async function getAllOrganizations(
  companyId: string,
  organizationType?: OrganizationType
): Promise<ActionResponse<Organization[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    let query = supabase
      .from('organizations')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (organizationType) {
      query = query.eq('organization_type', organizationType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching all organizations:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getAllOrganizations:', error);
    return { success: false, error: 'Failed to fetch organizations' };
  }
}

// =============================================
// UPDATE SITE MILESTONES
// =============================================

export async function updateSiteMilestones(
  organizationProjectId: string,
  data: import('@/lib/types/contacts-organizations').UpdateSiteMilestonesData
): Promise<ActionResponse<import('@/lib/types/contacts-organizations').OrganizationProject>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: updated, error } = await supabase
      .from('organization_protocols')
      .update({
        site_initiation_date: data.site_initiation_date,
        site_qualification_date: data.site_qualification_date,
        irb_approval_date: data.irb_approval_date,
        irb_expiration_date: data.irb_expiration_date,
        irb_approval_number: data.irb_approval_number,
        irb_institution_name: data.irb_institution_name,
        central_irb_name: data.central_irb_name,
        close_out_date: data.close_out_date,
        first_subject_enrolled_date: data.first_subject_enrolled_date,
        last_subject_enrolled_date: data.last_subject_enrolled_date,
        last_completed_visit_date: data.last_completed_visit_date,
        planned_subject_count: data.planned_subject_count,
        enrolled_subject_count: data.enrolled_subject_count,
        screen_failure_count: data.screen_failure_count,
        completed_subject_count: data.completed_subject_count,
      })
      .eq('id', organizationProjectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating site milestones:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error in updateSiteMilestones:', error);
    return { success: false, error: 'Failed to update site milestones' };
  }
}

type AddressInput = Omit<Address, 'id' | 'entity_type' | 'entity_id' | 'created_at' | 'updated_at'>;

export async function addOrganizationAddress(
  organizationId: string,
  data: AddressInput
): Promise<ActionResponse<Address>> {
  try {
    const supabase = await createClient();
    const { data: inserted, error } = await supabase
      .from('addresses')
      .insert({
        entity_type: 'organization',
        entity_id: organizationId,
        address_type: data.address_type,
        street_1: data.street_1,
        street_2: data.street_2,
        city: data.city,
        state: data.state,
        postal_code: data.postal_code,
        country: data.country,
        is_primary: data.is_primary ?? false,
        notes: data.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding address:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: inserted };
  } catch (error) {
    console.error('Error in addOrganizationAddress:', error);
    return { success: false, error: 'Failed to add address' };
  }
}

export async function updateOrganizationAddress(
  addressId: string,
  data: Partial<AddressInput>
): Promise<ActionResponse<Address>> {
  try {
    const supabase = await createClient();
    const { data: updated, error } = await supabase
      .from('addresses')
      .update({
        address_type: data.address_type,
        street_1: data.street_1,
        street_2: data.street_2,
        city: data.city,
        state: data.state,
        postal_code: data.postal_code,
        country: data.country,
        notes: data.notes ?? null,
      })
      .eq('id', addressId)
      .select()
      .single();

    if (error) {
      console.error('Error updating address:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error in updateOrganizationAddress:', error);
    return { success: false, error: 'Failed to update address' };
  }
}

export async function deleteOrganizationAddress(
  addressId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', addressId);

    if (error) {
      console.error('Error deleting address:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in deleteOrganizationAddress:', error);
    return { success: false, error: 'Failed to delete address' };
  }
}

