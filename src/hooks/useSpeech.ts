import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccessibilityStore, VoiceSpeed } from '@/store/useAccessibilityStore';
import { speak as speakWithVoiceEngine, stopSpeaking } from '@/lib/voice/useVoiceEngine';

export type SpeechStatus = 'Speech stopped' | 'Reading question' | 'Reading options' | 'Voice feedback' | 'Unsupported';

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (e: SpeechSynthesisErrorEvent | { error: 'not-supported' }) => void;
}

export function useSpeech() {
  const [status, setStatus] = useState<SpeechStatus>('Speech stopped');
  const { voiceSpeed, speechRate, language } = useAccessibilityStore();
  const speechGenerationRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (speechGenerationRef.current !== null) {
      stopSpeaking(speechGenerationRef.current);
    }
    speechGenerationRef.current = null;
    setStatus('Speech stopped');
  }, []);

  const speak = useCallback(
    (text: string, context: SpeechStatus, options?: SpeakOptions) => {
      if (
        typeof window === 'undefined' ||
        !('speechSynthesis' in window) ||
        typeof SpeechSynthesisUtterance === 'undefined'
      ) {
        setStatus('Unsupported');
        options?.onError?.({ error: 'not-supported' });
        return;
      }

      if (!text.trim()) {
        setStatus('Speech stopped');
        options?.onEnd?.();
        return;
      }
      setStatus(context);

      const speedMap: Record<VoiceSpeed, number> = {
        slow: 0.75,
        normal: 1,
        fast: 1.5,
      };
      const targetLang = language === 'hi' ? 'hi-IN' : 'en-US';
      const generation = speakWithVoiceEngine(text, {
        lang: targetLang,
        rate: speechRate || speedMap[voiceSpeed] || 1,
        priority: 'response',
        interrupt: true,
        onStart: () => {
          setStatus(context);
          options?.onStart?.();
        },
        onEnd: () => {
          speechGenerationRef.current = null;
          setStatus('Speech stopped');
          options?.onEnd?.();
        },
        onError: options?.onError,
      });
      speechGenerationRef.current = generation;
    },
    [voiceSpeed, speechRate, language]
  );

  useEffect(() => {
    return () => {
      if (speechGenerationRef.current !== null) {
        stopSpeaking(speechGenerationRef.current);
      }
    };
  }, []);

  const isSupported = typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';
  return { status, speak, stop, isSupported };
}
