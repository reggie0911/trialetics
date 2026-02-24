'use client';

import { useState, useRef, useCallback } from 'react';
import type { VoiceId } from '@/components/ai-assistant/ai-voice-selector';

export interface TranscriptEntry {
  role: 'user' | 'assistant';
  text: string;
}

interface UseRealtimeVoiceOptions {
  onTranscriptUpdate?: (transcript: TranscriptEntry[]) => void;
}

export function useRealtimeVoice(options?: UseRealtimeVoiceOptions) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentUserText, setCurrentUserText] = useState('');
  const [currentAssistantText, setCurrentAssistantText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const startSession = useCallback(async (
    voice: VoiceId,
    agentId?: string,
    currentPage?: string
  ) => {
    setError(null);
    setIsConnecting(true);
    setTranscript([]);
    setCurrentUserText('');
    setCurrentAssistantText('');

    try {
      const tokenRes = await fetch('/api/ai/realtime-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice, agentId, currentPage }),
      });

      if (!tokenRes.ok) {
        throw new Error('Failed to get session token');
      }

      const { clientSecret } = await tokenRes.json();
      if (!clientSecret) throw new Error('No client secret returned');

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioElRef.current = audioEl;

      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of ms.getTracks()) {
        pc.addTrack(track, ms);
      }

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          handleRealtimeEvent(event);
        } catch {}
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clientSecret}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (!sdpRes.ok) throw new Error('SDP exchange failed');

      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: await sdpRes.text(),
      };
      await pc.setRemoteDescription(answer);

      setIsActive(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      cleanup();
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleRealtimeEvent = useCallback((event: { type: string; [key: string]: unknown }) => {
    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        setIsSpeaking(true);
        break;

      case 'input_audio_buffer.speech_stopped':
        setIsSpeaking(false);
        break;

      case 'conversation.item.input_audio_transcription.completed': {
        const text = (event as { transcript?: string }).transcript || '';
        setCurrentUserText('');
        setTranscript(prev => {
          const updated = [...prev, { role: 'user' as const, text }];
          options?.onTranscriptUpdate?.(updated);
          return updated;
        });
        break;
      }

      case 'response.audio_transcript.delta': {
        const delta = (event as { delta?: string }).delta || '';
        setIsResponding(true);
        setCurrentAssistantText(prev => prev + delta);
        break;
      }

      case 'response.audio_transcript.done': {
        const fullText = (event as { transcript?: string }).transcript || '';
        setCurrentAssistantText('');
        setIsResponding(false);
        setTranscript(prev => {
          const updated = [...prev, { role: 'assistant' as const, text: fullText }];
          options?.onTranscriptUpdate?.(updated);
          return updated;
        });
        break;
      }

      case 'response.function_call_arguments.done': {
        const { call_id, name, arguments: args } = event as {
          call_id?: string;
          name?: string;
          arguments?: string;
        };
        if (call_id && name) {
          handleToolCall(call_id, name, args || '{}');
        }
        break;
      }

      case 'response.done':
        setIsResponding(false);
        break;
    }
  }, [options]);

  const handleToolCall = useCallback(async (
    callId: string,
    toolName: string,
    argsJson: string
  ) => {
    try {
      const res = await fetch('/api/ai/execute-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName, args: JSON.parse(argsJson) }),
      });
      const data = await res.json();

      const dc = dcRef.current;
      if (dc && dc.readyState === 'open') {
        dc.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify(data),
          },
        }));

        dc.send(JSON.stringify({ type: 'response.create' }));
      }
    } catch {
      const dc = dcRef.current;
      if (dc && dc.readyState === 'open') {
        dc.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify({ error: 'Tool execution failed' }),
          },
        }));
        dc.send(JSON.stringify({ type: 'response.create' }));
      }
    }
  }, []);

  const cleanup = useCallback(() => {
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.getSenders().forEach(sender => {
        sender.track?.stop();
      });
      pcRef.current.close();
      pcRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current = null;
    }
  }, []);

  const stopSession = useCallback(() => {
    cleanup();
    setIsActive(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    setIsResponding(false);
    setCurrentUserText('');
    setCurrentAssistantText('');
  }, [cleanup]);

  return {
    isActive,
    isConnecting,
    isSpeaking,
    isResponding,
    transcript,
    currentUserText,
    currentAssistantText,
    error,
    startSession,
    stopSession,
  };
}
