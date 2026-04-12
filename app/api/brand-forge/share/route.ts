import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response('Unauthorized', { status: 401 });

    const { projectId, expiresInDays = 30 } = await request.json();
    if (!projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 });

    const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single();
    if (!profile?.company_id) return Response.json({ error: 'No company' }, { status: 400 });

    const { data: project } = await supabase
      .from('bf_projects')
      .select('id, company_id')
      .eq('id', projectId)
      .eq('company_id', profile.company_id)
      .single();
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const { data: link, error } = await supabase
      .from('bf_share_links')
      .insert({
        project_id: projectId,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select('id, token, expires_at')
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ shareLink: link });
  } catch (err) {
    console.error('Share link error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response('Unauthorized', { status: 401 });

    const { linkId } = await request.json();
    if (!linkId) return Response.json({ error: 'Missing linkId' }, { status: 400 });

    const { error } = await supabase.from('bf_share_links').delete().eq('id', linkId).eq('created_by', user.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  } catch (err) {
    console.error('Delete share link error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
