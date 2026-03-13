import { streamText, tool, jsonSchema, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { ModelMessage, Tool, TextPart, ImagePart } from 'ai';
import type {
  ChatRequest,
  UserContext,
  StreamEvent,
  AgentConfig,
  ConfirmActionPayload,
} from './types';
import { identifyModule } from './context-builder';
import { getAgent, findAgentForPage, getAllAgents } from './agents';
import { createSSEStream } from './stream';
import { getAgentOverride } from '@/lib/actions/ai-agent-overrides';

const FALLBACK_AGENT_ID = 'dashboard-narrator';

async function selectAgent(request: ChatRequest, ctx: UserContext): Promise<AgentConfig> {
  if (request.agentId) {
    const agent = await getAgent(request.agentId);
    if (agent) return agent;
  }

  const pageAgent = await findAgentForPage(ctx.currentPage);
  if (pageAgent) return pageAgent;

  const fallback = await getAgent(FALLBACK_AGENT_ID);
  if (fallback) return fallback;

  throw new Error('No agent available');
}

async function buildSystemAndMessages(
  agent: AgentConfig,
  request: ChatRequest,
  ctx: UserContext
): Promise<{ system: string; messages: ModelMessage[] }> {
  const contextSummary = [
    `Current page: ${ctx.currentPage}`,
    ctx.protocolId ? `Active protocol ID: ${ctx.protocolId}` : null,
    `User role: ${ctx.userRole}`,
    `Module: ${identifyModule(ctx.currentPage)}`,
  ]
    .filter(Boolean)
    .join('\n');

  let systemContent = agent.systemPrompt;

  try {
    const override = await getAgentOverride(agent.id);
    if (override?.persona) {
      systemContent += `\n\n--- Persona ---\n${override.persona}`;
    }
    if (override?.task_instructions) {
      systemContent += `\n\n--- Task Instructions ---\n${override.task_instructions}`;
    }
  } catch {
    // Continue without overrides if fetch fails
  }

  systemContent += `\n\n--- Session Context ---\n${contextSummary}`;

  const messages: ModelMessage[] = [];

  for (const msg of request.messages) {
    if (msg.attachments && msg.attachments.length > 0) {
      const docTexts = msg.attachments
        .filter(a => a.type === 'document' && a.textContent)
        .map(a => `[Attached file: ${a.filename}]\n${a.textContent}`)
        .join('\n\n');

      const textContent = docTexts
        ? `${docTexts}\n\n${msg.content}`
        : msg.content;

      const contentParts: Array<TextPart | ImagePart> = [
        { type: 'text', text: textContent },
      ];

      for (const att of msg.attachments) {
        if (att.type === 'image' && att.imageUrl) {
          contentParts.push({ type: 'image', image: new URL(att.imageUrl) });
        }
      }

      // Attachments are only sent from user messages in this app
      messages.push({ role: 'user', content: contentParts });
    } else {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  return { system: systemContent, messages };
}

async function* runAgent(
  agent: AgentConfig,
  request: ChatRequest,
  ctx: UserContext
): AsyncGenerator<StreamEvent, void, unknown> {
  const { system, messages } = await buildSystemAndMessages(agent, request, ctx);

  // Queue for events emitted by tool execute callbacks
  const eventQueue: StreamEvent[] = [];
  const emitEvent = (event: StreamEvent) => eventQueue.push(event);

  // Build AI SDK tools from agent's tool definitions
  const tools: Record<string, Tool<any, any>> = {};
  for (const toolDef of agent.tools) {
    const capturedDef = toolDef;
    tools[capturedDef.name] = tool({
      description: capturedDef.description,
      inputSchema: jsonSchema<Record<string, unknown>>(
        capturedDef.parameters as Parameters<typeof jsonSchema>[0]
      ),
      execute: async (args: Record<string, unknown>) => {
        if (capturedDef.requiresConfirmation) {
          const payload: ConfirmActionPayload = {
            toolCallId: crypto.randomUUID(),
            toolName: capturedDef.name,
            description: capturedDef.description,
            args,
          };
          emitEvent({ type: 'confirm_action', data: JSON.stringify(payload) });
          return {
            pending: true,
            message: `Action "${capturedDef.name}" requires user confirmation.`,
          };
        }

        try {
          const result = await capturedDef.handler(args, ctx);

          if (result && typeof result === 'object' && 'downloadUrl' in (result as Record<string, unknown>)) {
            emitEvent({ type: 'file_download', data: JSON.stringify(result) });
          }

          if (
            capturedDef.name === 'generateTripReportQuestions' &&
            result &&
            typeof result === 'object' &&
            'questions' in (result as Record<string, unknown>)
          ) {
            emitEvent({ type: 'generated_questions', data: JSON.stringify(result) });
          }

          return result;
        } catch (err) {
          return { error: err instanceof Error ? err.message : 'Tool execution failed' };
        }
      },
    });
  }

  const hasTools = Object.keys(tools).length > 0;

  const result = streamText({
    model: openai(agent.model ?? 'gpt-4o'),
    system,
    messages,
    tools: hasTools ? tools : undefined,
    stopWhen: stepCountIs(5),
  });

  for await (const chunk of result.fullStream) {
    // Yield any events queued by tool executes before processing the next chunk
    while (eventQueue.length > 0) {
      yield eventQueue.shift()!;
    }

    if (chunk.type === 'text-delta') {
      yield { type: 'text_delta', data: chunk.text };
    } else if (chunk.type === 'tool-input-start') {
      yield { type: 'tool_call_start', data: chunk.toolName };
    } else if (chunk.type === 'tool-result') {
      yield {
        type: 'tool_result',
        data: JSON.stringify(chunk.output).slice(0, 500),
      };
    } else if (chunk.type === 'error') {
      throw chunk.error;
    }
  }

  // Yield any remaining queued events
  while (eventQueue.length > 0) {
    yield eventQueue.shift()!;
  }
}

export function orchestrate(
  request: ChatRequest,
  ctx: UserContext
): ReadableStream<Uint8Array> {
  return createSSEStream(async function* () {
    const agent = await selectAgent(request, ctx);
    yield* runAgent(agent, request, ctx);
  });
}

export async function listAgents(): Promise<Array<{ id: string; name: string; description: string }>> {
  const agents = await getAllAgents();
  return agents.map(a => ({
    id: a.id,
    name: a.name,
    description: a.description,
  }));
}
