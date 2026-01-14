'use client';

import { useState } from 'react';
import { Mic, Command, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AIAssistantInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function AIAssistantInput({ value, onChange, onSubmit }: AIAssistantInputProps) {
  const [isListening, setIsListening] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleVoiceClick = () => {
    setIsListening(!isListening);
    // UI only - no actual voice recognition
  };

  return (
    <div className="border-t bg-background p-4">
      {/* Input Field */}
      <div className="relative flex items-center gap-2 mb-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          className="flex-1 pr-12 text-sm"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          className={`absolute right-2 ${isListening ? 'text-red-500' : ''}`}
          onClick={handleVoiceClick}
        >
          <Mic className="h-4 w-4" />
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 px-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[10px] gap-1"
        >
          <Command className="h-3 w-3" />
          Shortcut
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[10px] gap-1"
        >
          <Paperclip className="h-3 w-3" />
          Attach
        </Button>
      </div>
    </div>
  );
}
