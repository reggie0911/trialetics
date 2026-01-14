'use client';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AIAssistantChat } from './ai-assistant-chat';

interface AIAssistantPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIAssistantPanel({ open, onOpenChange }: AIAssistantPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full max-w-[400px] p-0 flex flex-col"
        showCloseButton={true}
      >
        <AIAssistantChat />
      </SheetContent>
    </Sheet>
  );
}
