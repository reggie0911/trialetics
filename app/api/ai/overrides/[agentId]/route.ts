import { getAgentOverride, deleteAgentOverride } from '@/lib/actions/ai-agent-overrides';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  try {
    const override = await getAgentOverride(agentId);
    if (!override) {
      return Response.json({ override: null });
    }
    return Response.json({ override });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to get override' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  try {
    await deleteAgentOverride(agentId);
    return Response.json({ success: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to delete override' },
      { status: 500 }
    );
  }
}
