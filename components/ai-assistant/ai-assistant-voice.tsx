'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Mic, MicOff, PhoneOff, AlertCircle, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIVoiceSelector, type VoiceId } from './ai-voice-selector';
import { useRealtimeVoice, type TranscriptEntry } from '@/lib/hooks/use-realtime-voice';

interface AIAssistantVoiceProps {
  agentId?: string;
  onEnd?: (transcript: TranscriptEntry[]) => void;
}

export function AIAssistantVoice({ agentId, onEnd }: AIAssistantVoiceProps) {
  const pathname = usePathname();
  const [voice, setVoice] = useState<VoiceId>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ai-assistant-voice');
      return (stored as VoiceId) || 'coral';
    }
    return 'coral';
  });
  const [muted, setMuted] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const finalTranscriptRef = useRef<TranscriptEntry[]>([]);
  const onTranscriptUpdate = useCallback((t: TranscriptEntry[]) => {
    finalTranscriptRef.current = t;
  }, []);

  const {
    isActive,
    isConnecting,
    isSpeaking,
    isResponding,
    transcript,
    currentAssistantText,
    error,
    startSession,
    stopSession,
  } = useRealtimeVoice({ onTranscriptUpdate });

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, currentAssistantText]);

  const handleStart = () => {
    startSession(voice, agentId, pathname);
  };

  const handleEnd = () => {
    const finalTranscript = finalTranscriptRef.current;
    stopSession();
    onEnd?.(finalTranscript);
  };

  const toggleMute = () => {
    setMuted(prev => {
      const next = !prev;
      // Mute/unmute all audio tracks on the peer connection
      const pc = (window as unknown as { __rtcPeerConnection?: RTCPeerConnection }).__rtcPeerConnection;
      if (pc) {
        pc.getSenders().forEach(sender => {
          if (sender.track?.kind === 'audio') {
            sender.track.enabled = !next;
          }
        });
      }
      return next;
    });
  };

  const statusText = isConnecting
    ? 'Connecting...'
    : isSpeaking
      ? 'Listening...'
      : isResponding
        ? 'Speaking...'
        : isActive
          ? 'Ready'
          : '';

  if (!isActive && !isConnecting) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-8 gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mic className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Voice Mode</h3>
          <p className="text-xs text-muted-foreground text-center max-w-[240px]">
            Have a real-time voice conversation with the AI assistant.
          </p>
        </div>

        <div className="w-full max-w-[240px] space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Voice</label>
            <AIVoiceSelector value={voice} onChange={setVoice} />
          </div>

          <Button onClick={handleStart} className="w-full" disabled={isConnecting}>
            Start Conversation
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Visualizer area */}
      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <VoiceVisualizer isActive={isActive} isSpeaking={isSpeaking} isResponding={isResponding} />
        <span className="text-xs text-muted-foreground font-medium">{statusText}</span>
      </div>

      {/* Live transcript */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 border-t">
        {transcript.map((entry, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex-shrink-0 mt-0.5">
              {entry.role === 'user' ? (
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <User className="h-3 w-3 text-primary-foreground" />
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-3 w-3" />
                </div>
              )}
            </div>
            <p className="text-xs leading-relaxed">{entry.text}</p>
          </div>
        ))}
        {currentAssistantText && (
          <div className="flex gap-2 items-start opacity-70">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                <Bot className="h-3 w-3" />
              </div>
            </div>
            <p className="text-xs leading-relaxed">{currentAssistantText}</p>
          </div>
        )}
        <div ref={transcriptEndRef} />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-4 border-t">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={toggleMute}
        >
          {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={handleEnd}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>

      {error && (
        <div className="px-4 pb-2 flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function VoiceVisualizer({
  isActive,
  isSpeaking,
  isResponding,
}: {
  isActive: boolean;
  isSpeaking: boolean;
  isResponding: boolean;
}) {
  const bars = 5;
  const getAnimation = (index: number) => {
    if (!isActive) return {};
    const baseDelay = index * 0.1;
    if (isResponding) {
      return {
        animation: `voicePulse 0.6s ease-in-out ${baseDelay}s infinite alternate`,
      };
    }
    if (isSpeaking) {
      return {
        animation: `voicePulse 0.4s ease-in-out ${baseDelay}s infinite alternate`,
      };
    }
    return {
      animation: `voiceIdle 1.5s ease-in-out ${baseDelay}s infinite alternate`,
    };
  };

  return (
    <>
      <style>{`
        @keyframes voicePulse {
          0% { transform: scaleY(0.3); }
          100% { transform: scaleY(1); }
        }
        @keyframes voiceIdle {
          0% { transform: scaleY(0.2); }
          100% { transform: scaleY(0.4); }
        }
      `}</style>
      <div className="flex items-center gap-1 h-12">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 rounded-full ${
              isResponding
                ? 'bg-primary'
                : isSpeaking
                  ? 'bg-green-500'
                  : 'bg-muted-foreground/40'
            }`}
            style={{
              height: '100%',
              transformOrigin: 'center',
              ...getAnimation(i),
            }}
          />
        ))}
      </div>
    </>
  );
}
