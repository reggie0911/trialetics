'use client';

import { useRef, useCallback } from 'react';
import { Send, Square, Paperclip, X, FileText, Image as ImageIcon, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface PendingFile {
  id: string;
  file: File;
  previewUrl?: string;
}

interface AIAssistantInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isStreaming?: boolean;
  onStop?: () => void;
  pendingFiles?: PendingFile[];
  onFilesAdd?: (files: File[]) => void;
  onFileRemove?: (id: string) => void;
  onVoiceMode?: () => void;
}

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/gif,image/webp,application/pdf,text/csv,.csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function AIAssistantInput({
  value,
  onChange,
  onSubmit,
  isStreaming,
  onStop,
  pendingFiles = [],
  onFilesAdd,
  onFileRemove,
  onVoiceMode,
}: AIAssistantInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isStreaming) return;
      onSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onFilesAdd?.(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageFiles: File[] = [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      onFilesAdd?.(imageFiles);
    }
  }, [onFilesAdd]);

  const hasContent = value.trim() || pendingFiles.length > 0;

  return (
    <div className="border-t bg-background p-3">
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {pendingFiles.map(pf => (
            <div key={pf.id} className="relative group flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-[10px] max-w-[140px]">
              {pf.previewUrl ? (
                <img src={pf.previewUrl} alt="" className="h-5 w-5 rounded object-cover flex-shrink-0" />
              ) : pf.file.type.startsWith('image/') ? (
                <ImageIcon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              ) : (
                <FileText className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{pf.file.name}</span>
              <button
                onClick={() => onFileRemove?.(pf.id)}
                className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative flex items-center gap-1">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          className="flex-shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          title="Attach files"
        >
          <Paperclip className="h-3.5 w-3.5" />
        </Button>

        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Ask me anything..."
          className="flex-1 text-xs h-8"
          disabled={isStreaming}
        />

        {onVoiceMode && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="flex-shrink-0"
            onClick={onVoiceMode}
            disabled={isStreaming}
            title="Voice mode"
          >
            <Mic className="h-3.5 w-3.5" />
          </Button>
        )}

        {isStreaming ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="flex-shrink-0"
            onClick={onStop}
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            className="flex-shrink-0"
            onClick={onSubmit}
            disabled={!hasContent}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
