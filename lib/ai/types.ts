import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  moduleContext: string[];
  systemPrompt: string;
  tools: ToolDefinition[];
  model?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (args: Record<string, unknown>, ctx: UserContext) => Promise<unknown>;
}

export interface UserContext {
  currentPage: string;
  protocolId: string | null;
  companyId: string | null;
  userId: string;
  userRole: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  agentId?: string;
  context: {
    currentPage: string;
    protocolId?: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type StreamEventType = 'text_delta' | 'tool_call_start' | 'tool_result' | 'done' | 'error';

export interface StreamEvent {
  type: StreamEventType;
  data: string;
}

export type { ChatCompletionMessageParam, ChatCompletionTool };
