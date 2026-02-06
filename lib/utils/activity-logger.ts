/**
 * Activity logging utilities for tracking changes to organizations and contacts
 */

import { createClient } from '@/lib/server';

export interface ActivityLogData {
  entityId: string;
  activityType: 'created' | 'updated' | 'deleted' | 'status_changed' | 'type_changed';
  description: string;
  changedFields?: Record<string, { old: any; new: any }>;
  performedById?: string;
  performerEmail?: string;
}

/**
 * Logs an activity for an organization
 */
export async function logOrganizationActivity(data: ActivityLogData) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('organization_activity')
      .insert({
        organization_id: data.entityId,
        activity_type: data.activityType,
        description: data.description,
        changed_fields: data.changedFields || {},
        performed_by_id: data.performedById || null,
        performer_email: data.performerEmail || null,
      });

    if (error) {
      console.error('Failed to log organization activity:', error);
    }
  } catch (error) {
    console.error('Error logging organization activity:', error);
  }
}

/**
 * Logs an activity for a contact
 */
export async function logContactActivity(data: ActivityLogData) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('contact_activity')
      .insert({
        contact_id: data.entityId,
        activity_type: data.activityType,
        description: data.description,
        changed_fields: data.changedFields || {},
        performed_by_id: data.performedById || null,
        performer_email: data.performerEmail || null,
      });

    if (error) {
      console.error('Failed to log contact activity:', error);
    }
  } catch (error) {
    console.error('Error logging contact activity:', error);
  }
}

/**
 * Gets activity history for an organization
 */
export async function getOrganizationActivity(organizationId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('organization_activity')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to fetch organization activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching organization activity:', error);
    return { success: false, error: 'Failed to fetch activity history' };
  }
}

/**
 * Gets activity history for a contact
 */
export async function getContactActivity(contactId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('contact_activity')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to fetch contact activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching contact activity:', error);
    return { success: false, error: 'Failed to fetch activity history' };
  }
}

/**
 * Helper to generate description for organization updates
 */
export function generateOrganizationUpdateDescription(changedFields: Record<string, { old: any; new: any }>) {
  const fieldNames = Object.keys(changedFields);
  if (fieldNames.length === 1) {
    return `Updated ${fieldNames[0]}`;
  }
  return `Updated ${fieldNames.length} fields`;
}

/**
 * Helper to generate description for contact updates
 */
export function generateContactUpdateDescription(changedFields: Record<string, { old: any; new: any }>) {
  const fieldNames = Object.keys(changedFields);
  if (fieldNames.length === 1) {
    return `Updated ${fieldNames[0]}`;
  }
  return `Updated ${fieldNames.length} fields`;
}
