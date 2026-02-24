'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const VOICE_STORAGE_KEY = 'ai-assistant-voice';

export const VOICES = [
  { id: 'alloy', label: 'Alloy (neutral)' },
  { id: 'ash', label: 'Ash (soft)' },
  { id: 'ballad', label: 'Ballad (warm)' },
  { id: 'coral', label: 'Coral (friendly)' },
  { id: 'echo', label: 'Echo (clear)' },
  { id: 'sage', label: 'Sage (calm)' },
  { id: 'shimmer', label: 'Shimmer (bright)' },
  { id: 'verse', label: 'Verse (dynamic)' },
  { id: 'marin', label: 'Marin (gentle)' },
  { id: 'cedar', label: 'Cedar (deep)' },
] as const;

export type VoiceId = (typeof VOICES)[number]['id'];

interface AIVoiceSelectorProps {
  value?: VoiceId;
  onChange?: (voice: VoiceId) => void;
}

export function AIVoiceSelector({ value, onChange }: AIVoiceSelectorProps) {
  const [selectedVoice, setSelectedVoice] = useState<VoiceId>(() => {
    if (value) return value;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(VOICE_STORAGE_KEY);
      if (stored && VOICES.some(v => v.id === stored)) return stored as VoiceId;
    }
    return 'coral';
  });

  useEffect(() => {
    if (value !== undefined) setSelectedVoice(value);
  }, [value]);

  const handleChange = (v: string) => {
    const voiceId = v as VoiceId;
    setSelectedVoice(voiceId);
    try { localStorage.setItem(VOICE_STORAGE_KEY, voiceId); } catch {}
    onChange?.(voiceId);
  };

  return (
    <Select value={selectedVoice} onValueChange={handleChange}>
      <SelectTrigger className="w-full h-8 text-xs">
        <SelectValue placeholder="Select a voice" />
      </SelectTrigger>
      <SelectContent>
        {VOICES.map(v => (
          <SelectItem key={v.id} value={v.id} className="text-xs">
            {v.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
