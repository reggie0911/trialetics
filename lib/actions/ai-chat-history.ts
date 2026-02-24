'use server';

import { createClient } from '@/lib/server';

export interface ChatSessionSummary {
  id: string;
  title: string;
  agent_id: string | null;
  page_context: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatSessionFull extends ChatSessionSummary {
  messages: Array<{ role: string; content: string }>;
}

export async function listChatSessions(limit = 50): Promise<ChatSessionSummary[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .select('id, title, agent_id, page_context, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []) as ChatSessionSummary[];
}

export async function getChatSession(id: string): Promise<ChatSessionFull | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) return null;
  return data as ChatSessionFull;
}

export interface SaveChatSessionInput {
  id?: string;
  title: string;
  messages: Array<{ role: string; content: string }>;
  agentId?: string;
  pageContext?: string;
}

export async function saveChatSession(input: SaveChatSessionInput): Promise<ChatSessionFull> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();

  let title = input.title;
  if (title === 'New Chat' && input.messages.length > 0) {
    const firstUser = input.messages.find(m => m.role === 'user');
    if (firstUser) title = firstUser.content.slice(0, 60);
  }

  if (input.id) {
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .update({
        title,
        messages: input.messages,
        agent_id: input.agentId || null,
        page_context: input.pageContext || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as ChatSessionFull;
  }

  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .insert({
      user_id: user.id,
      company_id: profile?.company_id || null,
      title,
      messages: input.messages,
      agent_id: input.agentId || null,
      page_context: input.pageContext || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ChatSessionFull;
}

export async function deleteChatSession(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('ai_chat_sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
}
