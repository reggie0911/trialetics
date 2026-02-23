import OpenAI from 'openai';
import type {
  ChatRequest,
  UserContext,
  StreamEvent,
  AgentConfig,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from './types';
import { identifyModule } from './context-builder';
import { getToolHandler } from './tool-registry';
import { agentRegistry, findAgentForPage } from './agents';
import { createSSEStream } from './stream';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const FALLBACK_AGENT_ID = 'dashboard-narrator';

function selectAgent(request: ChatRequest, ctx: UserContext): AgentConfig {
  if (request.agentId && agentRegistry[request.agentId]) {
    return agentRegistry[request.agentId];
  }

  const pageAgent = findAgentForPage(ctx.currentPage);
  if (pageAgent) return pageAgent;

  return agentRegistry[FALLBACK_AGENT_ID] ?? Object.values(agentRegistry)[0];
}

function buildOpenAITools(agent: AgentConfig): ChatCompletionTool[] {
  return agent.tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

function buildMessages(
  agent: AgentConfig,
  request: ChatRequest,
  ctx: UserContext
): ChatCompletionMessageParam[] {
  const contextSummary = [
    `Current page: ${ctx.currentPage}`,
    ctx.protocolId ? `Active protocol ID: ${ctx.protocolId}` : null,
    `User role: ${ctx.userRole}`,
    `Module: ${identifyModule(ctx.currentPage)}`,
  ]
    .filter(Boolean)
    .join('\n');

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `${agent.systemPrompt}\n\n--- Session Context ---\n${contextSummary}`,
    },
  ];

  for (const msg of request.messages) {
    messages.push({ role: msg.role, content: msg.content });
  }

  return messages;
}

async function* runAgent(
  agent: AgentConfig,
  request: ChatRequest,
  ctx: UserContext
): AsyncGenerator<StreamEvent, void, unknown> {
  const tools = buildOpenAITools(agent);
  let messages = buildMessages(agent, request, ctx);

  const MAX_TOOL_ROUNDS = 5;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const stream = await getOpenAI().chat.completions.create({
      model: agent.model ?? 'gpt-4o',
      messages,
      tools: tools.length > 0 ? tools : undefined,
      stream: true,
    });

    let currentToolCalls: Record<
      number,
      { id: string; name: string; arguments: string }
    > = {};
    let hasToolCalls = false;
    let fullContent = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        fullContent += delta.content;
        yield { type: 'text_delta', data: delta.content };
      }

      if (delta.tool_calls) {
        hasToolCalls = true;
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (!currentToolCalls[idx]) {
            currentToolCalls[idx] = {
              id: tc.id ?? '',
              name: tc.function?.name ?? '',
              arguments: '',
            };
          }
          if (tc.id) currentToolCalls[idx].id = tc.id;
          if (tc.function?.name) currentToolCalls[idx].name = tc.function.name;
          if (tc.function?.arguments) {
            currentToolCalls[idx].arguments += tc.function.arguments;
          }
        }
      }
    }

    if (!hasToolCalls) {
      return;
    }

    messages = [
      ...messages,
      {
        role: 'assistant' as const,
        content: fullContent || null,
        tool_calls: Object.values(currentToolCalls).map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      },
    ];

    for (const tc of Object.values(currentToolCalls)) {
      yield { type: 'tool_call_start', data: tc.name };

      const handler = getToolHandler(tc.name);
      let result: unknown;

      if (handler) {
        try {
          const args = JSON.parse(tc.arguments || '{}');
          result = await handler(args, ctx);
        } catch (err) {
          result = {
            error: err instanceof Error ? err.message : 'Tool execution failed',
          };
        }
      } else {
        result = { error: `Unknown tool: ${tc.name}` };
      }

      const resultStr =
        typeof result === 'string' ? result : JSON.stringify(result);

      yield { type: 'tool_result', data: resultStr.slice(0, 500) };

      messages = [
        ...messages,
        {
          role: 'tool' as const,
          tool_call_id: tc.id,
          content: resultStr,
        },
      ];
    }

    currentToolCalls = {};
  }
}

export function orchestrate(
  request: ChatRequest,
  ctx: UserContext
): ReadableStream<Uint8Array> {
  const agent = selectAgent(request, ctx);

  return createSSEStream(() => runAgent(agent, request, ctx));
}

export function listAgents(): Array<{ id: string; name: string; description: string }> {
  return Object.values(agentRegistry).map(a => ({
    id: a.id,
    name: a.name,
    description: a.description,
  }));
}
