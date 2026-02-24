import { getChatSession, saveChatSession, deleteChatSession } from '@/lib/actions/ai-chat-history';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getChatSession(id);
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }
    return Response.json({ session });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to get session' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const session = await saveChatSession({ ...body, id });
    return Response.json({ session });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to update session' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await deleteChatSession(id);
    return Response.json({ success: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to delete session' },
      { status: 500 }
    );
  }
}
