'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIAssistantPanel } from './ai-assistant-panel';

export function AIAssistantButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform duration-200"
        size="icon"
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      {/* AI Assistant Panel */}
      <AIAssistantPanel open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
