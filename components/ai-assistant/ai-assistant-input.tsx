'use client';

import { Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AIAssistantInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isStreaming?: boolean;
  onStop?: () => void;
}

export function AIAssistantInput({
  value,
  onChange,
  onSubmit,
  isStreaming,
  onStop,
}: AIAssistantInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isStreaming) return;
      onSubmit();
    }
  };

  return (
    <div className="border-t bg-background p-3">
      <div className="relative flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          className="flex-1 pr-10 text-xs"
          disabled={isStreaming}
        />
        {isStreaming ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute right-1"
            onClick={onStop}
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute right-1"
            onClick={onSubmit}
            disabled={!value.trim()}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
