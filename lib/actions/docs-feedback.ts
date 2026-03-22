'use server';

import { createClient } from '@/lib/server';

interface SubmitFeedbackInput {
  docSlug: string;
  isHelpful: boolean;
  comment: string | null;
}

export async function submitDocsFeedback(input: SubmitFeedbackInput) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.company_id) throw new Error('Profile not found');

  const { error } = await supabase.from('docs_feedback').upsert(
    {
      doc_slug: input.docSlug,
      user_id: profile.id,
      company_id: profile.company_id,
      is_helpful: input.isHelpful,
      comment: input.comment,
    },
    { onConflict: 'doc_slug,user_id' }
  );

  if (error) throw new Error(error.message);

  return { success: true };
}
