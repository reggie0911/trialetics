'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  History,
  Maximize2,
  MoreHorizontal,
  Settings,
  Sparkles,
  Volume2,
} from 'lucide-react';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';

import { CopilotContextBar } from './copilot-context-bar';
import { CopilotSidebar } from './copilot-sidebar';
import { CopilotContextRail } from './copilot-context-rail';
import { CopilotChatTab } from './tabs/copilot-chat-tab';
import { CopilotActionsTab } from './tabs/copilot-actions-tab';
import { CopilotInsightsTab } from './tabs/copilot-insights-tab';
import { CopilotAgentsTab } from './tabs/copilot-agents-tab';

import { useCopilotContext } from '@/lib/copilot/context-provider';
import { useCopilotShortcuts } from '@/lib/copilot/shortcuts';

import type { AgentInfo } from './ai-assistant-chat';

const AIAssistantHistory = dynamic(() =>
  import('./ai-assistant-history').then(m => ({ default: m.AIAssistantHistory }))
);
const AIAssistantVoice = dynamic(() =>
  import('./ai-assistant-voice').then(m => ({ default: m.AIAssistantVoice }))
);
const AIAssistantSettings = dynamic(() =>
  import('./ai-assistant-settings').then(m => ({ default: m.AIAssistantSettings }))
);

type PrimaryTab = 'chat' | 'actions' | 'insights' | 'agents';
type Overlay = 'voice' | 'history' | 'settings';

interface ActivePersona {
  id: string;
  name: string;
  isActive: boolean;
}

/**
 * Trialetics Copilot shell. Mounted once at the protected layout root and
 * controlled via `useCopilotContext().isOpen`.
 *
 * Two layout modes:
 *   - **narrow** (default): the original right-aligned 520px side sheet with
 *     header + context bar + tabs. Untouched by the fullscreen redesign.
 *   - **fullscreen**: a ChatGPT-style 3-column workspace that takes over the
 *     viewport. Left = sidebar (brand, New chat, search, primary nav,
 *     time-bucketed history). Center = quiet header (agent + persona +
 *     Collapse/Close), read-only banner if the active study is closed,
 *     centered tab content (chat is `max-w-[760px]`, other tabs
 *     `max-w-[1100px]`). Right = context rail (working scope, pending
 *     approvals, last tool call, citations). The `CopilotContextBar` does
 *     not render in fullscreen — its information lives in the right rail.
 */
export function CopilotShell() {
  const { isOpen, open, close, isStudyReadOnly } = useCopilotContext();
  const [activeTab, setActiveTab] = useState<PrimaryTab>('chat');
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [pendingAgentId, setPendingAgentId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Lifted agent state — owned by the shell so the fullscreen header can host
  // the picker. Narrow mode passes `undefined` so the chat keeps using its
  // own internal agent state.
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | undefined>();
  const [activePersona, setActivePersona] = useState<ActivePersona | null>(null);

  const closeAll = useCallback(() => {
    setOverlay(null);
    close();
  }, [close]);

  useCopilotShortcuts({
    open: isOpen,
    onOpen: open,
    onClose: closeAll,
  });

  // Active persona — only fetched when the Copilot is open and in fullscreen
  // (the only surface that displays it). Non-blocking.
  useEffect(() => {
    if (!isOpen || !isFullscreen) return;
    let cancelled = false;
    fetch('/api/ai/personas')
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        const personas: ActivePersona[] = data.personas ?? [];
        const active = personas.find(p => p.isActive) ?? personas[0] ?? null;
        setActivePersona(active);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen, isFullscreen]);

  const handleSessionChange = useCallback((id: string | null) => {
    setActiveSessionId(id);
  }, []);

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setOverlay(null);
    setActiveTab('chat');
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
    setPendingAgentId(null);
    setOverlay(null);
    setActiveTab('chat');
  }, []);

  const handleOpenVoice = useCallback(() => {
    setOverlay('voice');
  }, []);

  const handleVoiceEnd = useCallback(() => {
    setOverlay(null);
    setActiveTab('chat');
  }, []);

  const handlePickAgent = useCallback((agentId: string) => {
    setPendingAgentId(agentId);
    setActiveSessionId(null);
    setActiveTab('chat');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('copilot:select-agent', { detail: { agentId } }));
    }
  }, []);

  const handleAgentsLoaded = useCallback((next: AgentInfo[]) => {
    setAgents(next);
  }, []);

  return (
    <Sheet open={isOpen} onOpenChange={o => (o ? open() : close())}>
      <SheetContent
        side="right"
        className={cn(
          'p-0 flex flex-col transition-[width,max-width] duration-200',
          isFullscreen
            ? '!w-screen !max-w-none sm:!max-w-none !inset-0 !border-l-0 !h-screen'
            : 'w-full max-w-[520px]'
        )}
        showCloseButton={false}
      >
        {isFullscreen ? (
          <FullscreenLayout
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            onCollapse={() => setIsFullscreen(false)}
            onClose={closeAll}
            onOpenOverlay={(o: Overlay) => setOverlay(o)}
            isStudyReadOnly={isStudyReadOnly}
            agents={agents}
            selectedAgent={selectedAgent}
            onSelectedAgentChange={setSelectedAgent}
            onAgentsLoaded={handleAgentsLoaded}
            activePersona={activePersona}
            handlePickAgent={handlePickAgent}
            pendingAgentId={pendingAgentId}
            handleSessionChange={handleSessionChange}
            handleVoiceEnd={handleVoiceEnd}
            handleOpenVoice={handleOpenVoice}
            handleSelectSession={handleSelectSession}
            handleNewChat={handleNewChat}
            overlay={overlay}
          />
        ) : (
          <>
            <CopilotShellHeader
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen(true)}
              onOpenOverlay={(o: Overlay) => setOverlay(o)}
              onClose={closeAll}
            />

            <CopilotContextBar />

            {overlay ? (
              <div className="flex-1 overflow-hidden">
                {overlay === 'voice' ? (
                  <AIAssistantVoice onEnd={handleVoiceEnd} />
                ) : overlay === 'history' ? (
                  <AIAssistantHistory
                    onSelectSession={handleSelectSession}
                    onNewChat={handleNewChat}
                  />
                ) : (
                  <AIAssistantSettings />
                )}
              </div>
            ) : (
              <Tabs
                tabsId="copilot-shell"
                value={activeTab}
                onValueChange={v => setActiveTab(v as PrimaryTab)}
                className="flex h-full flex-1 flex-col overflow-hidden"
              >
                <TabsList className="mx-4 mt-3 shrink-0">
                  <TabsTrigger value="chat">Chat</TabsTrigger>
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                  <TabsTrigger value="agents">Agents</TabsTrigger>
                </TabsList>

                <TabsContent value="chat" className="mt-0 flex-1 overflow-hidden">
                  <CopilotChatTab
                    key={`narrow-${activeSessionId ?? 'new'}-${pendingAgentId ?? 'auto'}`}
                    sessionId={activeSessionId}
                    onSessionChange={handleSessionChange}
                    onOpenVoice={handleOpenVoice}
                  />
                </TabsContent>
                <TabsContent value="actions" className="mt-0 flex-1 overflow-hidden">
                  <CopilotActionsTab />
                </TabsContent>
                <TabsContent value="insights" className="mt-0 flex-1 overflow-hidden">
                  <CopilotInsightsTab />
                </TabsContent>
                <TabsContent value="agents" className="mt-0 flex-1 overflow-hidden">
                  <CopilotAgentsTab onPickAgent={handlePickAgent} />
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface FullscreenLayoutProps {
  activeTab: PrimaryTab;
  onChangeTab: (tab: PrimaryTab) => void;
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onCollapse: () => void;
  onClose: () => void;
  onOpenOverlay: (o: Overlay) => void;
  isStudyReadOnly: boolean;
  agents: AgentInfo[];
  selectedAgent: string | undefined;
  onSelectedAgentChange: (id: string | undefined) => void;
  onAgentsLoaded: (agents: AgentInfo[]) => void;
  activePersona: ActivePersona | null;
  handlePickAgent: (id: string) => void;
  pendingAgentId: string | null;
  handleSessionChange: (id: string | null) => void;
  handleVoiceEnd: () => void;
  handleOpenVoice: () => void;
  handleSelectSession: (id: string) => void;
  handleNewChat: () => void;
  overlay: Overlay | null;
}

function FullscreenLayout({
  activeTab,
  onChangeTab,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onCollapse,
  onClose,
  onOpenOverlay,
  isStudyReadOnly,
  agents,
  selectedAgent,
  onSelectedAgentChange,
  onAgentsLoaded,
  activePersona,
  handlePickAgent,
  pendingAgentId,
  handleSessionChange,
  handleVoiceEnd,
  handleOpenVoice,
  handleSelectSession,
  handleNewChat,
  overlay,
}: FullscreenLayoutProps) {
  const chatColumn = activeTab === 'chat';

  return (
    <div className="flex h-full w-full bg-background">
      <CopilotSidebar
        activeTab={activeTab}
        onChangeTab={onChangeTab}
        activeSessionId={activeSessionId}
        onSelectSession={onSelectSession}
        onNewChat={onNewChat}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <CopilotCenterHeader
          agents={agents}
          selectedAgent={selectedAgent}
          onChangeAgent={onSelectedAgentChange}
          activePersona={activePersona}
          onCollapse={onCollapse}
          onClose={onClose}
          onOpenOverlay={onOpenOverlay}
        />

        {isStudyReadOnly && (
          <div className="border-b border-amber-500/40 bg-amber-500/10 px-6 py-1.5 text-xs text-amber-700 dark:text-amber-300">
            Study closed — actions are disabled.
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-hidden">
          {overlay ? (
            <div className="mx-auto h-full w-full max-w-[760px]">
              {overlay === 'voice' ? (
                <AIAssistantVoice onEnd={handleVoiceEnd} />
              ) : overlay === 'settings' ? (
                <AIAssistantSettings />
              ) : (
                /* History overlay isn't reachable in fullscreen (the sidebar
                   already shows the list), but render a fallback just in
                   case something dispatches it. */
                <AIAssistantHistory
                  onSelectSession={handleSelectSession}
                  onNewChat={handleNewChat}
                />
              )}
            </div>
          ) : chatColumn ? (
            <div className="mx-auto flex h-full w-full max-w-[760px] flex-col">
              <CopilotChatTab
                key={`fs-${activeSessionId ?? 'new'}-${pendingAgentId ?? 'auto'}`}
                sessionId={activeSessionId}
                onSessionChange={handleSessionChange}
                onOpenVoice={handleOpenVoice}
                variant="fullscreen"
                selectedAgent={selectedAgent}
                onSelectedAgentChange={onSelectedAgentChange}
                onAgentsLoaded={onAgentsLoaded}
              />
            </div>
          ) : (
            <div className="mx-auto h-full w-full max-w-[1100px] overflow-y-auto px-2 py-4">
              {activeTab === 'actions' ? (
                <CopilotActionsTab />
              ) : activeTab === 'insights' ? (
                <CopilotInsightsTab />
              ) : (
                <CopilotAgentsTab onPickAgent={handlePickAgent} />
              )}
            </div>
          )}
        </div>
      </div>

      <CopilotContextRail />
    </div>
  );
}

interface CopilotCenterHeaderProps {
  agents: AgentInfo[];
  selectedAgent: string | undefined;
  onChangeAgent: (id: string | undefined) => void;
  activePersona: ActivePersona | null;
  onCollapse: () => void;
  onClose: () => void;
  onOpenOverlay: (o: Overlay) => void;
}

function CopilotCenterHeader({
  agents,
  selectedAgent,
  onChangeAgent,
  activePersona,
  onCollapse,
  onClose,
  onOpenOverlay,
}: CopilotCenterHeaderProps) {
  const selectedAgentName = agents.find(a => a.id === selectedAgent)?.name ?? 'Auto-select agent';

  return (
    <header className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <DropdownMenuTrigger
              className={buttonVariants({
                variant: 'ghost',
                size: 'sm',
                className:
                  'group h-8 gap-1.5 px-2 text-sm font-medium transition-all duration-200 ease-out hover:bg-accent/50 hover:shadow-sm active:scale-[0.98] data-popup-open:bg-accent/40',
              })}
            >
              <Sparkles
                className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:scale-110"
                style={{ color: 'var(--copilot-accent)' }}
              />
              {selectedAgentName}
              <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-opacity duration-200 group-hover:opacity-90" />
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start" className="max-w-xs text-xs">
            Choose which agent answers. Auto-select picks the best match for your current page.
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="w-[300px]">
          <DropdownMenuItem onClick={() => onChangeAgent(undefined)} className="text-xs">
            Auto-select (recommended)
          </DropdownMenuItem>
          {agents.map(agent => (
            <DropdownMenuItem
              key={agent.id}
              onClick={() => onChangeAgent(agent.id)}
              className="flex flex-col items-start gap-0.5 text-xs"
            >
              <span className="font-medium">{agent.name}</span>
              <span className="line-clamp-1 text-[10px] text-muted-foreground">
                {agent.description}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {activePersona && (
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--copilot-accent)]/30 bg-[var(--copilot-accent)]/5 px-2 py-0.5 text-[11px] font-medium text-[var(--copilot-accent)]">
                {activePersona.name}
              </span>
            }
          />
          <TooltipContent side="bottom" className="max-w-xs text-xs">
            Active Copilot persona
          </TooltipContent>
        </Tooltip>
      )}

      <div className="flex-1" />

      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={onCollapse}>
              <ChevronLeft className="h-3.5 w-3.5" />
              Collapse
            </Button>
          }
        />
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          Collapse to side panel
        </TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              }
            />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs">
            Voice mode and Copilot settings.
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" sideOffset={4}>
          <DropdownMenuItem onClick={() => onOpenOverlay('voice')} className="cursor-pointer text-xs">
            <Volume2 className="mr-2 h-3.5 w-3.5" />
            Voice mode
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onOpenOverlay('settings')} className="cursor-pointer text-xs">
            <Settings className="mr-2 h-3.5 w-3.5" />
            Copilot settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onClose}>
              Close <Kbd className="ml-1.5 hidden text-[10px] sm:inline-block">Esc</Kbd>
            </Button>
          }
        />
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          Close the Copilot. <Kbd className="ml-1 text-[10px]">Esc</Kbd>
        </TooltipContent>
      </Tooltip>
    </header>
  );
}

function CopilotShellHeader({
  isFullscreen,
  onToggleFullscreen,
  onOpenOverlay,
  onClose,
}: {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenOverlay: (o: Overlay) => void;
  onClose: () => void;
}) {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b px-4 py-2.5">
      <div
        className="flex h-7 w-7 items-center justify-center rounded-md"
        style={{ background: 'color-mix(in oklch, var(--copilot-accent) 15%, transparent)' }}
      >
        <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--copilot-accent)' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium leading-tight">Trialetics Copilot</p>
        <p className="text-[10px] text-muted-foreground leading-tight">Context-aware clinical operations assistant</p>
      </div>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleFullscreen}>
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          }
        />
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          {isFullscreen ? 'Collapse to side panel' : 'Expand to workspace width'}
        </TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              }
            />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs">
            Voice mode, conversation history, and Copilot settings.
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" sideOffset={4}>
          <DropdownMenuItem onClick={() => onOpenOverlay('voice')} className="cursor-pointer text-xs">
            <Volume2 className="mr-2 h-3.5 w-3.5" />
            Voice mode
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenOverlay('history')} className="cursor-pointer text-xs">
            <History className="mr-2 h-3.5 w-3.5" />
            Conversation history
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onOpenOverlay('settings')} className="cursor-pointer text-xs">
            <Settings className="mr-2 h-3.5 w-3.5" />
            Copilot settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={onClose}>
              Close <Kbd className="ml-1.5 hidden text-[10px] sm:inline-block">Esc</Kbd>
            </Button>
          }
        />
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          Close the Copilot. <Kbd className="ml-1 text-[10px]">Esc</Kbd>
        </TooltipContent>
      </Tooltip>
    </header>
  );
}
