'use server';

import { createClient } from '@/lib/server';
import { OrganizationNote } from '@/lib/types/contacts-organizations';
import { revalidatePath } from 'next/cache';

/**
 * Get all notes for an organization
 * @param organizationId - The organization ID
 * @returns Array of notes ordered by created_at DESC
 */
export async function getOrganizationNotes(organizationId: string): Promise<OrganizationNote[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organization_notes')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching organization notes:', error);
    throw new Error(`Failed to fetch organization notes: ${error.message}`);
  }

  return data || [];
}

/**
 * Create a new note for an organization
 * @param organizationId - The organization ID
 * @param companyId - The company ID
 * @param content - The note content
 * @param createdById - The profile ID of the creator
 * @param creatorEmail - The email of the creator
 * @param noteType - Optional note type (general, exclusion, etc.)
 * @returns The created note
 */
export async function createOrganizationNote(
  organizationId: string,
  companyId: string,
  content: string,
  createdById: string,
  creatorEmail: string,
  noteType?: string | null
): Promise<OrganizationNote> {
  const supabase = await createClient();

  // Validate input
  if (!content || content.trim().length === 0) {
    throw new Error('Note content cannot be empty');
  }

  if (content.length > 10000) {
    throw new Error('Note content is too long (maximum 10000 characters)');
  }

  const { data, error } = await supabase
    .from('organization_notes')
    .insert({
      organization_id: organizationId,
      company_id: companyId,
      content: content.trim(),
      created_by_id: createdById,
      creator_email: creatorEmail,
      note_type: noteType || 'general',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating organization note:', error);
    throw new Error(`Failed to create note: ${error.message}`);
  }

  // Revalidate the organization detail page
  revalidatePath(`/protected/contacts-organizations/${organizationId}`);

  return data;
}

/**
 * Update an existing note
 * @param noteId - The note ID
 * @param content - The updated content
 * @param noteType - Optional note type update
 * @returns The updated note
 */
export async function updateOrganizationNote(
  noteId: string,
  content: string,
  noteType?: string | null
): Promise<OrganizationNote> {
  const supabase = await createClient();

  // Validate input
  if (!content || content.trim().length === 0) {
    throw new Error('Note content cannot be empty');
  }

  if (content.length > 10000) {
    throw new Error('Note content is too long (maximum 10000 characters)');
  }

  const updatePayload: Record<string, unknown> = {
    content: content.trim(),
    updated_at: new Date().toISOString(),
  };
  if (noteType !== undefined) {
    updatePayload.note_type = noteType || 'general';
  }

  const { data, error } = await supabase
    .from('organization_notes')
    .update(updatePayload)
    .eq('id', noteId)
    .select()
    .single();

  if (error) {
    console.error('Error updating organization note:', error);
    throw new Error(`Failed to update note: ${error.message}`);
  }

  // Revalidate the organization detail page
  revalidatePath(`/protected/contacts-organizations/${data.organization_id}`);

  return data;
}

/**
 * Delete a note
 * @param noteId - The note ID
 * @param organizationId - The organization ID (for revalidation)
 */
export async function deleteOrganizationNote(
  noteId: string,
  organizationId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('organization_notes')
    .delete()
    .eq('id', noteId);

  if (error) {
    console.error('Error deleting organization note:', error);
    throw new Error(`Failed to delete note: ${error.message}`);
  }

  // Revalidate the organization detail page
  revalidatePath(`/protected/contacts-organizations/${organizationId}`);
}
