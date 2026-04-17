'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIAssistantChat } from './ai-assistant-chat';
import type { TranscriptEntry } from '@/lib/hooks/use-realtime-voice';

const AIAssistantHistory = dynamic(() => import('./ai-assistant-history').then(m => ({ default: m.AIAssistantHistory })));
const AIAssistantVoice = dynamic(() => import('./ai-assistant-voice').then(m => ({ default: m.AIAssistantVoice })));
const AIAssistantSettings = dynamic(() => import('./ai-assistant-settings').then(m => ({ default: m.AIAssistantSettings })));

interface AIAssistantPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIAssistantPanel({ open, onOpenChange }: AIAssistantPanelProps) {
  const [activeTab, setActiveTab] = useState('chat');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setActiveTab('chat');
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
    setActiveTab('chat');
  }, []);

  const handleSessionChange = useCallback((id: string | null) => {
    setActiveSessionId(id);
  }, []);

  const handleVoiceMode = useCallback(() => {
    setActiveTab('voice');
  }, []);

  const handleVoiceEnd = useCallback((transcript: TranscriptEntry[]) => {
    if (transcript.length > 0) {
      // Voice transcript could be saved as a session in the future
    }
    setActiveTab('chat');
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full max-w-[480px] p-0 flex flex-col"
        showCloseButton={true}
      >
        <Tabs tabsId="ai-assistant" value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <TabsList className="mx-4 mt-3 shrink-0">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
            <AIAssistantChat
              key={activeSessionId ?? 'new'}
              sessionId={activeSessionId}
              onSessionChange={handleSessionChange}
              onVoiceMode={handleVoiceMode}
            />
          </TabsContent>
          <TabsContent value="voice" className="flex-1 overflow-hidden mt-0">
            <AIAssistantVoice onEnd={handleVoiceEnd} />
          </TabsContent>
          <TabsContent value="history" className="flex-1 overflow-auto mt-0">
            <AIAssistantHistory
              onSelectSession={handleSelectSession}
              onNewChat={handleNewChat}
            />
          </TabsContent>
          <TabsContent value="settings" className="flex-1 overflow-hidden mt-0">
            <AIAssistantSettings />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
