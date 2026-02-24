import { createClient } from '@/lib/server';
import { getAgent } from '@/lib/ai/agents';
import { identifyModule } from '@/lib/ai/context-builder';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const voice = body.voice || 'coral';
    const agentId = body.agentId;
    const currentPage = body.currentPage || '/protected/dashboard';

    const agent = agentId
      ? (await getAgent(agentId)) ?? (await getAgent('dashboard-narrator'))!
      : (await getAgent('dashboard-narrator'))!;

    const contextSummary = [
      `Current page: ${currentPage}`,
      `Module: ${identifyModule(currentPage)}`,
    ].join('\n');

    const toolDefs = agent.tools
      .filter(t => !t.requiresConfirmation)
      .map(t => ({
        type: 'function' as const,
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      }));

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview',
        voice,
        instructions: `${agent.systemPrompt}\n\n--- Session Context ---\n${contextSummary}`,
        tools: toolDefs.length > 0 ? toolDefs : undefined,
        input_audio_transcription: { model: 'gpt-4o-mini-transcribe' },
        turn_detection: { type: 'server_vad', silence_duration_ms: 600 },
        modalities: ['text', 'audio'],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('OpenAI Realtime session error:', errData);
      return Response.json(
        { error: 'Failed to create realtime session' },
        { status: 502 }
      );
    }

    const data = await response.json();

    return Response.json({
      clientSecret: data.client_secret?.value,
      expiresAt: data.client_secret?.expires_at,
    });
  } catch (err) {
    console.error('Realtime token error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to create session' },
      { status: 500 }
    );
  }
}
