'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Loader2, AlertCircle, ChevronDown, Download, CheckCircle2, XCircle, Wrench, FileText } from 'lucide-react';
import { SoundWaveAnimation } from './sound-wave-animation';
import { AIAssistantInput } from './ai-assistant-input';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ChatMessage, ChatMessageAttachment, StreamEvent, ConfirmActionPayload } from '@/lib/ai/types';
import type { PendingFile } from './ai-assistant-input';

interface AgentInfo {
  id: string;
  name: string;
  description: string;
}

export interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatMessageAttachment[];
}

interface PendingConfirmation {
  payload: ConfirmActionPayload;
  status: 'pending' | 'confirmed' | 'cancelled' | 'executing' | 'done' | 'error';
  result?: string;
}

interface FileDownload {
  downloadUrl: string;
  filename: string;
  rowCount?: number;
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

interface AIAssistantChatProps {
  sessionId?: string | null;
  onSessionChange?: (id: string | null) => void;
  onVoiceMode?: () => void;
}

export function AIAssistantChat({ sessionId, onSessionChange, onVoiceMode }: AIAssistantChatProps = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const protocolId = searchParams.get('protocolId') ?? searchParams.get('projectId') ?? undefined;

  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | undefined>();
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([]);
  const [fileDownloads, setFileDownloads] = useState<FileDownload[]>([]);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const currentSessionIdRef = useRef<string | null>(sessionId ?? null);

  const handleFilesAdd = useCallback((files: File[]) => {
    const newPending: PendingFile[] = files.map(file => {
      const id = crypto.randomUUID();
      const previewUrl = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : undefined;
      return { id, file, previewUrl };
    });
    setPendingFiles(prev => [...prev, ...newPending]);
  }, []);

  const handleFileRemove = useCallback((id: string) => {
    setPendingFiles(prev => {
      const item = prev.find(p => p.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  }, []);

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

  // Load session when sessionId changes
  useEffect(() => {
    currentSessionIdRef.current = sessionId ?? null;
    if (sessionId) {
      fetch(`/api/ai/history/${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.session) {
            setMessages(data.session.messages || []);
            if (data.session.agent_id) setSelectedAgent(data.session.agent_id);
          }
        })
        .catch(() => {});
    }
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveSession = useCallback(async (msgs: DisplayMessage[]) => {
    if (msgs.length === 0) return;
    try {
      const firstUserMsg = msgs.find(m => m.role === 'user');
      const title = firstUserMsg ? firstUserMsg.content.slice(0, 60) : 'New Chat';
      const body = {
        id: currentSessionIdRef.current || undefined,
        title,
        messages: msgs,
        agentId: selectedAgent,
        pageContext: pathname,
      };
      const method = currentSessionIdRef.current ? 'PUT' : 'POST';
      const url = currentSessionIdRef.current
        ? `/api/ai/history/${currentSessionIdRef.current}`
        : '/api/ai/history';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.session?.id && !currentSessionIdRef.current) {
        currentSessionIdRef.current = data.session.id;
        onSessionChange?.(data.session.id);
      }
    } catch {
      // silent fail on save
    }
  }, [selectedAgent, pathname, onSessionChange]);

  const sendMessage = useCallback(async (content: string) => {
    if ((!content.trim() && pendingFiles.length === 0) || isStreaming) return;

    setError(null);
    setPendingConfirmations([]);
    setFileDownloads([]);
    setToolStatus(null);

    let uploadedAttachments: ChatMessageAttachment[] | undefined;
    if (pendingFiles.length > 0) {
      try {
        const formData = new FormData();
        for (const pf of pendingFiles) formData.append('files', pf.file);
        const uploadRes = await fetch('/api/ai/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.attachments) uploadedAttachments = uploadData.attachments;
      } catch {
        setError('Failed to upload attachments');
        return;
      }
      for (const pf of pendingFiles) {
        if (pf.previewUrl) URL.revokeObjectURL(pf.previewUrl);
      }
      setPendingFiles([]);
    }

    const userMessage: DisplayMessage = {
      role: 'user',
      content: content.trim() || (uploadedAttachments ? 'Analyze the attached file(s).' : ''),
      attachments: uploadedAttachments,
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsStreaming(true);

    const assistantMessage: DisplayMessage = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMessage]);

    const controller = new AbortController();
    abortRef.current = controller;

    let finalMessages = updatedMessages;

    try {
      const chatMessages: ChatMessage[] = updatedMessages.map(m => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments,
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
            } else if (event.type === 'tool_call_start') {
              setToolStatus(`Calling ${event.data}...`);
            } else if (event.type === 'tool_result') {
              setToolStatus(null);
            } else if (event.type === 'confirm_action') {
              try {
                const payload: ConfirmActionPayload = JSON.parse(event.data);
                setPendingConfirmations(prev => [...prev, { payload, status: 'pending' }]);
              } catch { /* skip */ }
            } else if (event.type === 'file_download') {
              try {
                const dl: FileDownload = JSON.parse(event.data);
                setFileDownloads(prev => [...prev, dl]);
              } catch { /* skip */ }
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
      setToolStatus(null);
      abortRef.current = null;
      // Auto-save session after streaming completes
      setMessages(prev => {
        finalMessages = prev;
        return prev;
      });
      setTimeout(() => saveSession(finalMessages), 300);
    }
  }, [messages, isStreaming, selectedAgent, pathname, protocolId, saveSession, pendingFiles]);

  const handleSubmit = () => sendMessage(inputValue);
  const handlePromptClick = (prompt: string) => sendMessage(prompt);

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const handleConfirmAction = useCallback(async (index: number) => {
    setPendingConfirmations(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: 'executing' };
      return updated;
    });

    const confirmation = pendingConfirmations[index];
    try {
      const res = await fetch('/api/ai/execute-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: confirmation.payload.toolName,
          args: confirmation.payload.args,
        }),
      });
      const data = await res.json();
      setPendingConfirmations(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: data.success ? 'done' : 'error',
          result: data.success ? 'Action completed successfully.' : (data.error || 'Action failed.'),
        };
        return updated;
      });
    } catch (err) {
      setPendingConfirmations(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: 'error',
          result: err instanceof Error ? err.message : 'Action failed.',
        };
        return updated;
      });
    }
  }, [pendingConfirmations]);

  const handleCancelAction = useCallback((index: number) => {
    setPendingConfirmations(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: 'cancelled', result: 'Action cancelled by user.' };
      return updated;
    });
  }, []);

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
                  <div>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {message.attachments.map(att => (
                          att.type === 'image' && att.imageUrl ? (
                            <img key={att.id} src={att.imageUrl} alt={att.filename} className="h-16 w-16 rounded object-cover border" />
                          ) : (
                            <span key={att.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-[10px]">
                              <FileText className="h-3 w-3" />
                              {att.filename}
                            </span>
                          )
                        ))}
                      </div>
                    )}
                    <p className="text-sm">{message.content}</p>
                  </div>
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

          {/* Tool execution status */}
          {toolStatus && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-xs">
              <Wrench className="h-3 w-3 animate-pulse" />
              <span>{toolStatus}</span>
            </div>
          )}

          {/* File download cards */}
          {fileDownloads.map((dl, idx) => (
            <div key={`dl-${idx}`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card">
              <Download className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{dl.filename}</p>
                {dl.rowCount !== undefined && (
                  <p className="text-[10px] text-muted-foreground">{dl.rowCount} rows</p>
                )}
              </div>
              <a
                href={dl.downloadUrl}
                download={dl.filename}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-medium hover:bg-primary/90 transition-colors"
              >
                <Download className="h-3 w-3" />
                Download
              </a>
            </div>
          ))}

          {/* Confirmation cards */}
          {pendingConfirmations.map((conf, idx) => (
            <div key={`conf-${idx}`} className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="flex items-start gap-2">
                {conf.status === 'done' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                ) : conf.status === 'error' ? (
                  <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                ) : conf.status === 'cancelled' ? (
                  <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">
                    {conf.status === 'pending' ? 'Confirm Action' : conf.status === 'executing' ? 'Executing...' : conf.status === 'done' ? 'Completed' : conf.status === 'cancelled' ? 'Cancelled' : 'Failed'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{conf.payload.description}</p>
                  <div className="mt-1 text-[10px] font-mono bg-muted rounded px-2 py-1 overflow-x-auto">
                    {Object.entries(conf.payload.args).map(([k, v]) => (
                      <div key={k}><span className="text-muted-foreground">{k}:</span> {String(v)}</div>
                    ))}
                  </div>
                  {conf.result && (
                    <p className="text-[10px] mt-1 text-muted-foreground">{conf.result}</p>
                  )}
                </div>
              </div>
              {conf.status === 'pending' && (
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleCancelAction(idx)}>
                    Cancel
                  </Button>
                  <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => handleConfirmAction(idx)}>
                    Confirm
                  </Button>
                </div>
              )}
              {conf.status === 'executing' && (
                <div className="flex items-center gap-1.5 text-muted-foreground justify-end">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-[10px]">Executing...</span>
                </div>
              )}
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
        pendingFiles={pendingFiles}
        onFilesAdd={handleFilesAdd}
        onFileRemove={handleFileRemove}
        onVoiceMode={onVoiceMode}
      />
    </div>
  );
}
