import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccessibilityStore, VoiceSpeed } from '@/store/useAccessibilityStore';
import { formatSpeechPronunciation, getNaturalFemaleVoice } from '@/lib/accessibility/voice-companion';

export type SpeechStatus = 'Speech stopped' | 'Reading question' | 'Reading options' | 'Voice feedback' | 'Unsupported';

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (e: SpeechSynthesisErrorEvent) => void;
}

export function useSpeech() {
  const [status, setStatus] = useState<SpeechStatus>('Speech stopped');
  const { voiceSpeed, speechRate, language } = useAccessibilityStore();
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (synth && synth.speaking) {
      synth.cancel();
    }
    setStatus('Speech stopped');
  }, [synth]);

  const speak = useCallback(
    (text: string, context: SpeechStatus, options?: SpeakOptions) => {
      if (!synth) {
        setStatus('Unsupported');
        if (options?.onError) {
          options.onError({ error: 'not-supported' } as any);
        }
        return;
      }

      // Cancel any ongoing speech silently without triggering 'Speech stopped'
      if (synth.speaking) {
        synth.cancel();
      }

      // Set status immediately so we don't have an intermediate 'Speech stopped' state
      setStatus(context);

      const utterance = new SpeechSynthesisUtterance(formatSpeechPronunciation(text));

      // Map speed
      const speedMap: Record<VoiceSpeed, number> = {
        slow: 0.75,
        normal: 1,
        fast: 1.5,
      };
      utterance.rate = speechRate || speedMap[voiceSpeed] || 1;

      // Lock in the exact same natural female voice across the platform
      const targetLang = language === 'hi' ? 'hi' : 'en';
      utterance.lang = targetLang === 'hi' ? 'hi-IN' : 'en-US';
      const femaleVoice = getNaturalFemaleVoice(targetLang);
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      // Handle events
      utterance.onstart = () => {
        setStatus(context);
        options?.onStart?.();
      };
      utterance.onend = () => {
        setStatus('Speech stopped');
        options?.onEnd?.();
      };
      utterance.onerror = (e) => {
        if (e.error !== 'canceled') {
          setStatus('Speech stopped');
        }
        options?.onError?.(e);
      };

      utteranceRef.current = utterance;
      if (typeof window !== 'undefined') {
        (window as any).__useSpeechUtterance = utterance;
      }

      if (synth.paused) {
        try {
          synth.resume();
        } catch (_) {}
      }

      synth.speak(utterance);
    },
    [synth, voiceSpeed, speechRate, language, stop]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (synth) {
        synth.cancel();
      }
    };
  }, [synth]);

  return { status, speak, stop, isSupported: !!synth };
}
