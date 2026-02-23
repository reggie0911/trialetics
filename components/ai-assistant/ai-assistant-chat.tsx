'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { SoundWaveAnimation } from './sound-wave-animation';
import { AIAssistantInput } from './ai-assistant-input';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ChatMessage, StreamEvent } from '@/lib/ai/types';

interface AgentInfo {
  id: string;
  name: string;
  description: string;
}

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_PROMPTS: Record<string, string[]> = {
  'contacts-organizations': [
    'List all active contacts',
    'Show organizations by type',
    'Who are the principal investigators?',
  ],
  'document-management': [
    'Summarize recent document uploads',
    'What documents are missing?',
    'Show upload history',
  ],
  patients: [
    'How many subjects are enrolled?',
    'Show subjects by site',
    'Any overdue visits?',
  ],
  'trip-reports': [
    'Summarize recent monitoring visits',
    'Show open follow-up items',
    'List pending trip reports',
  ],
  'sdv-tracker': [
    'Show SDV progress by site',
    'Which sites are below target?',
    'Summarize SDV completion rates',
  ],
  'clinical-payments': [
    'Show payment status by site',
    'Any payment exceptions?',
    'Summarize outstanding payments',
  ],
  'clinical-training': [
    'Show training completion rates',
    'Which sites are non-compliant?',
    'List active training plans',
  ],
  vw: [
    'Show upcoming visit windows',
    'Any overdue visits?',
    'List visit templates',
  ],
};

function getModuleKey(pathname: string): string {
  const match = pathname.match(/^\/protected\/([^/]+)/);
  return match?.[1] ?? 'dashboard';
}

export function AIAssistantChat() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const protocolId = searchParams.get('protocolId') ?? searchParams.get('projectId') ?? undefined;

  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | undefined>();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const moduleKey = getModuleKey(pathname);
  const prompts = SUGGESTED_PROMPTS[moduleKey] ?? [
    'What can you help me with?',
    'Show me an overview',
    'Guide me to the right module',
  ];

  useEffect(() => {
    fetch('/api/ai/chat')
      .then(res => res.json())
      .then(data => {
        if (data.agents) setAgents(data.agents);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return;

    setError(null);
    const userMessage: DisplayMessage = { role: 'user', content: content.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsStreaming(true);

    const assistantMessage: DisplayMessage = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMessage]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const chatMessages: ChatMessage[] = updatedMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages,
          agentId: selectedAgent,
          context: {
            currentPage: pathname,
            protocolId,
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event: StreamEvent = JSON.parse(jsonStr);

            if (event.type === 'text_delta') {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + event.data,
                  };
                }
                return updated;
              });
            } else if (event.type === 'error') {
              setError(event.data);
            }
          } catch {
            // skip malformed SSE events
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      setMessages(prev => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.role === 'assistant' && !updated[updated.length - 1]?.content) {
          updated.pop();
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [messages, isStreaming, selectedAgent, pathname, protocolId]);

  const handleSubmit = () => sendMessage(inputValue);
  const handlePromptClick = (prompt: string) => sendMessage(prompt);

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const selectedAgentName = agents.find(a => a.id === selectedAgent)?.name;

  return (
    <div className="flex flex-col h-full">
      {/* Agent Selector */}
      {agents.length > 0 && (
        <div className="px-4 pt-3 pb-1">
          <DropdownMenu>
            <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm", className: "w-full justify-between text-xs h-8" })}>
                {selectedAgentName ?? 'Auto-select agent'}
                <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[280px]">
              <DropdownMenuItem
                onClick={() => setSelectedAgent(undefined)}
                className="text-xs"
              >
                Auto-select (recommended)
              </DropdownMenuItem>
              {agents.map(agent => (
                <DropdownMenuItem
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className="text-xs flex flex-col items-start gap-0.5"
                >
                  <span className="font-medium">{agent.name}</span>
                  <span className="text-muted-foreground text-[10px] line-clamp-1">
                    {agent.description}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {messages.length === 0 ? (
        <>
          {/* Welcome Header */}
          <div className="py-8 px-6 text-center">
            <SoundWaveAnimation />
            <h2 className="text-xl font-semibold mt-4 mb-2">Hi,</h2>
            <h2 className="text-xl font-semibold mb-2">
              Welcome back! How can I help?
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              I&apos;m here to help you tackle your tasks.
              <br />
              Choose from the prompts below or just
              <br />
              tell me what you need!
            </p>
          </div>

          {/* Suggested Prompts */}
          <div className="px-6 space-y-2">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handlePromptClick(prompt)}
                className="w-full text-left px-3 py-2 rounded-lg border border-border hover:bg-accent text-xs transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </>
      ) : (
        /* Messages Area */
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((message, index) => (
            <div key={index} className="flex gap-2.5">
              <div className="flex-shrink-0 mt-0.5">
                {message.role === 'user' ? (
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                ) : (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {message.role === 'user' ? (
                  <p className="text-sm">{message.content}</p>
                ) : message.content ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm [&_table]:text-xs [&_pre]:text-xs [&_code]:text-xs">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : isStreaming && index === messages.length - 1 ? (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-xs">Thinking...</span>
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input Area */}
      <AIAssistantInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        isStreaming={isStreaming}
        onStop={handleStop}
      />
    </div>
  );
}
