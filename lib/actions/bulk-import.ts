'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import {
  OrganizationCSVRow,
  ContactCSVRow,
  BulkImportResult,
} from '@/lib/types/contacts-organizations-csv';
import { CreateAddressData } from '@/lib/types/contacts-organizations';
import { assignContactToOrganization } from './contacts';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// =============================================
// BULK IMPORT ORGANIZATIONS
// =============================================

export async function bulkImportOrganizations(
  companyId: string,
  profileId: string,
  creatorEmail: string,
  organizations: OrganizationCSVRow[]
): Promise<ActionResponse<BulkImportResult>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const result: BulkImportResult = {
      success: true,
      organizationsCreated: 0,
      contactsCreated: 0,
      addressesCreated: 0,
      relationshipsCreated: 0,
      errors: [],
      warnings: [],
    };

    // Prepare organizations for batch insert
    const orgsToInsert = organizations.map((org) => ({
      company_id: companyId,
      name: org.name,
      organization_type: org.organization_type,
      status: org.status || 'active',
      phone: org.phone || null,
      email: org.email || null,
      website: org.website || null,
      notes: org.notes || null,
      metadata: {},
      created_by_id: profileId,
      creator_email: creatorEmail,
    }));

    // Batch insert organizations
    const { data: insertedOrgs, error: orgError } = await supabase
      .from('organizations')
      .insert(orgsToInsert)
      .select();

    if (orgError) {
      return {
        success: false,
        error: `Failed to import organizations: ${orgError.message}`,
      };
    }

    result.organizationsCreated = insertedOrgs?.length || 0;

    // Create addresses for organizations
    if (insertedOrgs) {
      const addressesToInsert: CreateAddressData[] = [];

      insertedOrgs.forEach((org, index) => {
        const orgData = organizations[index];
        const hasAddress =
          orgData.street_1 ||
          orgData.street_2 ||
          orgData.city ||
          orgData.state ||
          orgData.postal_code ||
          orgData.country;

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

      // Batch insert addresses
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

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: result };
  } catch (error) {
    console.error('Error in bulkImportOrganizations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import organizations',
    };
  }
}

// =============================================
// BULK IMPORT CONTACTS
// =============================================

export async function bulkImportContacts(
  companyId: string,
  profileId: string,
  creatorEmail: string,
  contacts: ContactCSVRow[],
  organizationNameMap?: Map<string, string> // Map organization names to IDs
): Promise<ActionResponse<BulkImportResult>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const result: BulkImportResult = {
      success: true,
      organizationsCreated: 0,
      contactsCreated: 0,
      addressesCreated: 0,
      relationshipsCreated: 0,
      errors: [],
      warnings: [],
    };

    // Prepare contacts for batch insert
    const contactsToInsert = contacts.map((contact) => ({
      company_id: companyId,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email || null,
      phone: contact.phone || null,
      title: contact.title || null,
      credentials: contact.credentials || null,
      license_number: contact.license_number || null,
      status: contact.status || 'active',
      notes: contact.notes || null,
      metadata: {},
      created_by_id: profileId,
      creator_email: creatorEmail,
    }));

    // Batch insert contacts
    const { data: insertedContacts, error: contactError } = await supabase
      .from('contacts')
      .insert(contactsToInsert)
      .select();

    if (contactError) {
      return {
        success: false,
        error: `Failed to import contacts: ${contactError.message}`,
      };
    }

    result.contactsCreated = insertedContacts?.length || 0;

    // Create addresses for contacts
    if (insertedContacts) {
      const addressesToInsert: CreateAddressData[] = [];

      insertedContacts.forEach((contact, index) => {
        const contactData = contacts[index];
        const hasAddress =
          contactData.street_1 ||
          contactData.street_2 ||
          contactData.city ||
          contactData.state ||
          contactData.postal_code ||
          contactData.country;

        if (hasAddress) {
          addressesToInsert.push({
            entity_type: 'contact',
            entity_id: contact.id,
            address_type: 'primary',
            street_1: contactData.street_1 || null,
            street_2: contactData.street_2 || null,
            city: contactData.city || null,
            state: contactData.state || null,
            postal_code: contactData.postal_code || null,
            country: contactData.country || 'United States',
            is_primary: true,
          });
        }
      });

      // Batch insert addresses
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

      // Create organization-contact relationships
      if (organizationNameMap && insertedContacts) {
        const relationshipPromises: Promise<void>[] = [];

        insertedContacts.forEach((contact, index) => {
          const contactData = contacts[index];
          if (contactData.organization_name && contactData.contact_role) {
            const orgId = organizationNameMap.get(contactData.organization_name);
            if (orgId) {
              relationshipPromises.push(
                assignContactToOrganization({
                  contact_id: contact.id,
                  organization_id: orgId,
                  role: contactData.contact_role,
                  is_primary: false, // Don't auto-set as primary in bulk import
                  status: 'active',
                }).then((relResult) => {
                  if (relResult.success) {
                    result.relationshipsCreated++;
                  } else {
                    result.errors.push({
                      rowIndex: index + 1,
                      type: 'relationship',
                      error: `Failed to link contact to organization ${contactData.organization_name}: ${relResult.error}`,
                    });
                  }
                })
              );
            } else {
              result.errors.push({
                rowIndex: index + 1,
                type: 'relationship',
                error: `Organization not found: ${contactData.organization_name}`,
              });
            }
          }
        });

        await Promise.all(relationshipPromises);
      }
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: result };
  } catch (error) {
    console.error('Error in bulkImportContacts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import contacts',
    };
  }
}

// =============================================
// BULK IMPORT WITH RELATIONSHIPS
// =============================================

export async function bulkImportWithRelationships(
  companyId: string,
  profileId: string,
  creatorEmail: string,
  organizations: OrganizationCSVRow[],
  contacts: ContactCSVRow[]
): Promise<ActionResponse<BulkImportResult>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const result: BulkImportResult = {
      success: true,
      organizationsCreated: 0,
      contactsCreated: 0,
      addressesCreated: 0,
      relationshipsCreated: 0,
      errors: [],
      warnings: [],
    };

    // Step 1: Import organizations first
    if (organizations.length > 0) {
      const orgResult = await bulkImportOrganizations(companyId, profileId, creatorEmail, organizations);
      if (!orgResult.success || !orgResult.data) {
        return orgResult;
      }
      result.organizationsCreated = orgResult.data.organizationsCreated;
      result.addressesCreated += orgResult.data.addressesCreated;
      result.errors.push(...orgResult.data.errors);
      result.warnings.push(...orgResult.data.warnings);
    }

    // Step 2: Build organization name to ID map
    const organizationNameMap = new Map<string, string>();
    if (organizations.length > 0) {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('company_id', companyId)
        .in(
          'name',
          organizations.map((o) => o.name)
        );

      orgs?.forEach((org) => {
        organizationNameMap.set(org.name.toLowerCase().trim(), org.id);
      });
    }

    // Step 3: Import contacts with relationships
    if (contacts.length > 0) {
      const contactResult = await bulkImportContacts(
        companyId,
        profileId,
        creatorEmail,
        contacts,
        organizationNameMap
      );
      if (!contactResult.success || !contactResult.data) {
        return contactResult;
      }
      result.contactsCreated = contactResult.data.contactsCreated;
      result.addressesCreated += contactResult.data.addressesCreated;
      result.relationshipsCreated = contactResult.data.relationshipsCreated;
      result.errors.push(...contactResult.data.errors);
      result.warnings.push(...contactResult.data.warnings);
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: result };
  } catch (error) {
    console.error('Error in bulkImportWithRelationships:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import data',
    };
  }
}
