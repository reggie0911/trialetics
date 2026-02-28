'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import {
  OrganizationCSVRow,
  DedupedContact,
  BulkImportResult,
} from '@/lib/types/contacts-organizations-csv';
import { CreateAddressData } from '@/lib/types/contacts-organizations';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

const CHUNK_SIZE = 25;

function emptyResult(): BulkImportResult {
  return {
    success: true,
    organizationsCreated: 0,
    contactsCreated: 0,
    addressesCreated: 0,
    relationshipsCreated: 0,
    organizationDuplicatesSkipped: 0,
    contactDuplicatesSkipped: 0,
    errors: [],
    warnings: [],
  };
}


// =============================================
// IMPORT ORGANIZATION CHUNK
// =============================================

export async function importOrganizationChunk(
  companyId: string,
  profileId: string,
  creatorEmail: string,
  organizations: OrganizationCSVRow[]
): Promise<ActionResponse<BulkImportResult>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: 'User not authenticated' };

    const result = emptyResult();

    const orgsToInsert = organizations.map((org) => ({
      company_id: companyId,
      name: org.name,
      organization_type: org.organization_type,
      status: 'active',
      phone: org.phone || null,
      email: org.email || null,
      website: org.website || null,
      notes: org.notes || null,
      site_id: org.site_id || null,
      metadata: {},
      created_by_id: profileId,
      creator_email: creatorEmail,
    }));

    const { data: insertedOrgs, error: orgError } = await supabase
      .from('organizations')
      .insert(orgsToInsert)
      .select();

    if (orgError) {
      return { success: false, error: `Failed to import organizations: ${orgError.message}` };
    }

    result.organizationsCreated = insertedOrgs?.length || 0;

    if (insertedOrgs) {
      const addressesToInsert: CreateAddressData[] = [];

      insertedOrgs.forEach((org, index) => {
        const orgData = organizations[index];
        const hasAddress =
          orgData.street_1 || orgData.street_2 || orgData.city ||
          orgData.state || orgData.postal_code || orgData.country;

        if (hasAddress) {
          addressesToInsert.push({
            entity_type: 'organization',
            entity_id: org.id,
            address_type: 'primary',
            street_1: orgData.street_1 || null,
            street_2: orgData.street_2 || null,
            city: orgData.city || null,
            state: orgData.state || null,
            postal_code: orgData.postal_code || null,
            country: orgData.country || 'United States',
            is_primary: true,
          });
        }
      });

      if (addressesToInsert.length > 0) {
        const addressInserts = addressesToInsert.map((addr) => ({
          entity_type: addr.entity_type,
          entity_id: addr.entity_id,
          address_type: addr.address_type,
          street_1: addr.street_1,
          street_2: addr.street_2,
          city: addr.city,
          state: addr.state,
          postal_code: addr.postal_code,
          country: addr.country,
          is_primary: addr.is_primary,
        }));

        const { error: addressError } = await supabase.from('addresses').insert(addressInserts);
        if (addressError) {
          result.warnings.push(`Some addresses failed to create: ${addressError.message}`);
        } else {
          result.addressesCreated = addressesToInsert.length;
        }
      }
    }

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import organizations',
    };
  }
}

// =============================================
// IMPORT CONTACT CHUNK
// =============================================

export async function importContactChunk(
  companyId: string,
  profileId: string,
  creatorEmail: string,
  contacts: DedupedContact[],
  organizationNameMap: Record<string, string>,
  organizationSiteIdMap: Record<string, string>,
  ambiguousNames: string[]
): Promise<ActionResponse<BulkImportResult>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: 'User not authenticated' };

    const result = emptyResult();
    const nameMap = new Map(Object.entries(organizationNameMap));
    const siteIdMap = new Map(Object.entries(organizationSiteIdMap));
    const ambiguousSet = new Set(ambiguousNames);

    const contactsToInsert = contacts.map((c) => ({
      company_id: companyId,
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      phone: c.phone || null,
      title: c.title || null,
      credentials: c.credentials || null,
      license_number: c.license_number || null,
      status: 'active',
      notes: c.notes || null,
      metadata: {},
      created_by_id: profileId,
      creator_email: creatorEmail,
    }));

    const { data: insertedContactsRaw, error: contactError } = await supabase
      .from('contacts')
      .insert(contactsToInsert)
      .select();

    if (contactError) {
      return { success: false, error: `Failed to import contacts: ${contactError.message}` };
    }

    const insertedContacts = (insertedContactsRaw || []).map((contact, index) => ({
      contact,
      source: contacts[index],
    }));
    result.contactsCreated = insertedContacts.length;

    if (insertedContacts.length > 0) {
      // Create addresses (one per unique contact)
      const addressesToInsert: Array<{
        entity_type: string;
        entity_id: string;
        address_type: string;
        street_1: string | null;
        street_2: string | null;
        city: string | null;
        state: string | null;
        postal_code: string | null;
        country: string | null;
        is_primary: boolean;
      }> = [];

      insertedContacts.forEach(({ contact, source }) => {
        const hasAddress =
          source.street_1 || source.street_2 || source.city ||
          source.state || source.postal_code || source.country;
        if (hasAddress) {
          addressesToInsert.push({
            entity_type: 'contact',
            entity_id: contact.id,
            address_type: 'primary',
            street_1: source.street_1 || null,
            street_2: source.street_2 || null,
            city: source.city || null,
            state: source.state || null,
            postal_code: source.postal_code || null,
            country: source.country || 'United States',
            is_primary: true,
          });
        }
      });

      if (addressesToInsert.length > 0) {
        const { error: addressError } = await supabase.from('addresses').insert(addressesToInsert);
        if (addressError) {
          result.warnings.push(`Some addresses failed to create: ${addressError.message}`);
        } else {
          result.addressesCreated = addressesToInsert.length;
        }
      }

      // Create organization-contact relationships (multiple per contact)
      const relationshipsToInsert: Array<{
        organization_id: string;
        contact_id: string;
        role: string;
        is_primary: boolean;
        status: 'active';
      }> = [];

      insertedContacts.forEach(({ contact, source }, idx) => {
        const isPrimarySet = new Set<string>();
        source.orgLinks.forEach((link) => {
          const normName = link.organization_name.toLowerCase().trim();
          let orgId: string | undefined;

          if (link.organization_site_id && siteIdMap.size > 0) {
            const siteKey = `${normName}|${link.organization_site_id.toLowerCase().trim()}`;
            orgId = siteIdMap.get(siteKey);
            if (!orgId) {
              result.errors.push({
                rowIndex: idx + 1,
                type: 'relationship',
                error: `Organization not found with name "${link.organization_name}" and site_id "${link.organization_site_id}"`,
              });
              return;
            }
          } else if (ambiguousSet.has(normName)) {
            result.errors.push({
              rowIndex: idx + 1,
              type: 'relationship',
              error: `Multiple organizations match name "${link.organization_name}". Provide organization_site_id to disambiguate.`,
            });
            return;
          } else {
            orgId = nameMap.get(normName);
            if (!orgId) {
              result.errors.push({
                rowIndex: idx + 1,
                type: 'relationship',
                error: `Organization not found: ${link.organization_name}`,
              });
              return;
            }
          }

          relationshipsToInsert.push({
            organization_id: orgId,
            contact_id: contact.id,
            role: link.contact_role ?? 'other',
            is_primary: !isPrimarySet.has(contact.id),
            status: 'active',
          });
          isPrimarySet.add(contact.id);
        });
      });

      if (relationshipsToInsert.length > 0) {
        const { error: relationshipError } = await supabase
          .from('organization_contacts')
          .insert(relationshipsToInsert);

        if (relationshipError) {
          result.errors.push({
            rowIndex: 1,
            type: 'relationship',
            error: `Failed to link contacts to organizations: ${relationshipError.message}`,
          });
        } else {
          result.relationshipsCreated = relationshipsToInsert.length;
        }
      }
    }

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import contacts',
    };
  }
}

// =============================================
// BUILD ORG RESOLUTION MAPS
// =============================================

export async function buildOrgResolutionMaps(
  companyId: string,
  orgNames: string[]
): Promise<ActionResponse<{
  nameMap: Record<string, string>;
  siteIdMap: Record<string, string>;
  ambiguousNames: string[];
}>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: 'User not authenticated' };

    const organizationNameMap = new Map<string, string>();
    const organizationSiteIdMap = new Map<string, string>();
    const ambiguousNames = new Set<string>();

    if (orgNames.length > 0) {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name, site_id')
        .eq('company_id', companyId)
        .in('name', orgNames);

      orgs?.forEach((org: { id: string; name: string; site_id: string | null }) => {
        const normName = org.name.toLowerCase().trim();

        if (organizationNameMap.has(normName)) {
          ambiguousNames.add(normName);
          organizationNameMap.delete(normName);
        } else if (!ambiguousNames.has(normName)) {
          organizationNameMap.set(normName, org.id);
        }

        if (org.site_id) {
          const siteKey = `${normName}|${org.site_id.toLowerCase().trim()}`;
          organizationSiteIdMap.set(siteKey, org.id);
        }
      });
    }

    return {
      success: true,
      data: {
        nameMap: Object.fromEntries(organizationNameMap),
        siteIdMap: Object.fromEntries(organizationSiteIdMap),
        ambiguousNames: [...ambiguousNames],
      },
    };
  } catch (error) {
    return { success: false, error: 'Failed to build resolution maps' };
  }
}

// =============================================
// REVALIDATE PATH (called at end of upload)
// =============================================

export async function revalidateContactsOrganizations() {
  revalidatePath('/protected/contacts-organizations');
}

