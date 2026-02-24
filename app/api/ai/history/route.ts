import { listChatSessions, saveChatSession } from '@/lib/actions/ai-chat-history';

export async function GET() {
  try {
    const sessions = await listChatSessions();
    return Response.json({ sessions });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to list sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = await saveChatSession(body);
    return Response.json({ session });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to save session' },
      { status: 500 }
    );
  }
}
