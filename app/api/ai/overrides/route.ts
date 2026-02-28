import { listAgentOverrides, upsertAgentOverride } from '@/lib/actions/ai-agent-overrides';

export async function GET() {
  try {
    const overrides = await listAgentOverrides();
    return Response.json({ overrides });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to list overrides' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const override = await upsertAgentOverride(body);
    return Response.json({ override });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to save override' },
      { status: 500 }
    );
  }
}
