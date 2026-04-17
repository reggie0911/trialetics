'use client';

import { useRef, useCallback } from 'react';
import { Send, Square, Paperclip, X, FileText, Image as ImageIcon, Mic, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
  /**
   * `narrow` — original side-panel composer with `border-t` + `Paperclip`.
   * `fullscreen` — ChatGPT-style floating composer (rounded-2xl, shadow,
   * `Plus` attach button on the left, no top border) used inside the
   * fullscreen shell.
   */
  variant?: 'narrow' | 'fullscreen';
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
  variant = 'narrow',
}: AIAssistantInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fullscreen = variant === 'fullscreen';

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
    <div
      className={cn(
        fullscreen
          ? 'bg-transparent px-4 pb-6 pt-2'
          : 'border-t bg-background p-3'
      )}
    >
      {pendingFiles.length > 0 && (
        <div
          className={cn(
            'flex flex-wrap gap-1.5',
            fullscreen ? 'mx-auto mb-2 max-w-[760px]' : 'mb-2'
          )}
        >
          {pendingFiles.map(pf => (
            <div
              key={pf.id}
              className="relative group flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-[11px] max-w-[160px]"
            >
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

      <div
        className={cn(
          'relative flex items-center gap-1',
          fullscreen &&
            'mx-auto max-w-[760px] gap-2 rounded-2xl border bg-card px-2 py-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.04)]'
        )}
      >
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
          className={cn('flex-shrink-0', fullscreen && 'h-8 w-8 rounded-full')}
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          title="Attach files"
        >
          {fullscreen ? <Plus className="h-4 w-4" /> : <Paperclip className="h-3.5 w-3.5" />}
        </Button>

        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={fullscreen ? 'Ask anything' : 'Ask me anything...'}
          className={cn(
            fullscreen
              ? 'h-9 flex-1 border-0 bg-transparent text-sm shadow-none focus-visible:border-0 focus-visible:ring-0'
              : 'flex-1 text-xs h-8'
          )}
          disabled={isStreaming}
        />

        {onVoiceMode && (
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn('flex-shrink-0', fullscreen && 'h-8 w-8 rounded-full')}
            onClick={onVoiceMode}
            disabled={isStreaming}
            title="Voice mode"
          >
            <Mic className={cn(fullscreen ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
          </Button>
        )}

        {isStreaming ? (
          <Button
            variant={fullscreen ? 'default' : 'ghost'}
            size="icon-sm"
            className={cn('flex-shrink-0', fullscreen && 'h-8 w-8 rounded-full')}
            onClick={onStop}
          >
            <Square className={cn(fullscreen ? 'h-3.5 w-3.5' : 'h-3.5 w-3.5')} />
          </Button>
        ) : (
          <Button
            variant={fullscreen ? 'default' : 'ghost'}
            size="icon-sm"
            className={cn('flex-shrink-0', fullscreen && 'h-8 w-8 rounded-full')}
            onClick={onSubmit}
            disabled={!hasContent}
          >
            <Send className={cn(fullscreen ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
          </Button>
        )}
      </div>
    </div>
  );
}
