import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccessibilityStore, VoiceSpeed } from '@/store/useAccessibilityStore';

export type SpeechStatus = 'Speech stopped' | 'Reading question' | 'Reading options' | 'Unsupported';

export function useSpeech() {
  const [status, setStatus] = useState<SpeechStatus>('Speech stopped');
  const { voiceSpeed, audioAssistance } = useAccessibilityStore();
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (synth && synth.speaking) {
      synth.cancel();
    }
    setStatus('Speech stopped');
  }, [synth]);

  const speak = useCallback(
    (text: string, context: 'Reading question' | 'Reading options') => {
      if (!synth) {
        setStatus('Unsupported');
        return;
      }
      if (!audioAssistance) {
        return;
      }

      // Stop any current speech
      stop();

      const utterance = new SpeechSynthesisUtterance(text);

      // Map speed
      const speedMap: Record<VoiceSpeed, number> = {
        slow: 0.75,
        normal: 1,
        fast: 1.5,
      };
      utterance.rate = speedMap[voiceSpeed] || 1;

      // Handle events
      utterance.onstart = () => {
        setStatus(context);
      };
      utterance.onend = () => {
        setStatus('Speech stopped');
      };
      utterance.onerror = (e) => {
        if (e.error !== 'canceled') {
          setStatus('Speech stopped');
        }
      };

      utteranceRef.current = utterance;
      synth.speak(utterance);
    },
    [synth, audioAssistance, voiceSpeed, stop]
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
