import { NextRequest } from 'next/server';
import { createClient } from '@/lib/server';
import { getToolDefinition } from '@/lib/ai/tool-registry';
import type { UserContext } from '@/lib/ai/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    const body = await request.json();
    const { toolName, args } = body as { toolName: string; args: Record<string, unknown> };

    if (!toolName) {
      return new Response(JSON.stringify({ error: 'toolName is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const toolDef = await getToolDefinition(toolName);
    const handler = toolDef?.handler;
    if (!handler) {
      return new Response(JSON.stringify({ error: `Unknown tool: ${toolName}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ctx: UserContext = {
      currentPage: '',
      protocolId: (args.protocol_id as string) ?? null,
      companyId: profile?.company_id ?? null,
      userId: user.id,
      userRole: profile?.role ?? 'user',
    };

    const result = await handler(args, ctx);

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('AI execute-action error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : 'Execution failed',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
