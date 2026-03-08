'use server';

import { createClient } from '@/lib/server';
import { ContactNote } from '@/lib/types/contacts-organizations';
import { revalidatePath } from 'next/cache';

export async function getContactNotes(contactId: string): Promise<ContactNote[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('contact_notes')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching contact notes:', error);
    throw new Error(`Failed to fetch contact notes: ${error.message}`);
  }

  return data || [];
}

export async function createContactNote(
  contactId: string,
  companyId: string,
  content: string,
  createdById: string,
  creatorEmail: string,
  noteType?: string | null
): Promise<ContactNote> {
  const supabase = await createClient();

  if (!content || content.trim().length === 0) {
    throw new Error('Note content cannot be empty');
  }

  if (content.length > 10000) {
    throw new Error('Note content is too long (maximum 10000 characters)');
  }

  const { data, error } = await supabase
    .from('contact_notes')
    .insert({
      contact_id: contactId,
      company_id: companyId,
      content: content.trim(),
      created_by_id: createdById,
      creator_email: creatorEmail,
      note_type: noteType || 'general',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating contact note:', error);
    throw new Error(`Failed to create note: ${error.message}`);
  }

  revalidatePath(`/protected/contacts-organizations/contacts/${contactId}`);

  return data;
}

export async function updateContactNote(
  noteId: string,
  content: string,
  noteType?: string | null
): Promise<ContactNote> {
  const supabase = await createClient();

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
    .from('contact_notes')
    .update(updatePayload)
    .eq('id', noteId)
    .select()
    .single();

  if (error) {
    console.error('Error updating contact note:', error);
    throw new Error(`Failed to update note: ${error.message}`);
  }

  revalidatePath(`/protected/contacts-organizations/contacts/${data.contact_id}`);

  return data;
}

export async function deleteContactNote(
  noteId: string,
  contactId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('contact_notes')
    .delete()
    .eq('id', noteId);

  if (error) {
    console.error('Error deleting contact note:', error);
    throw new Error(`Failed to delete note: ${error.message}`);
  }

  revalidatePath(`/protected/contacts-organizations/contacts/${contactId}`);
}
