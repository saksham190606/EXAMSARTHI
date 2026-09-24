import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccessibilityStore, VoiceSpeed } from '@/store/useAccessibilityStore';

import { parseMathToSpeech } from '@/lib/voice/mathParser';

export type SpeechStatus = 'Speech stopped' | 'Reading question' | 'Reading options' | 'Voice feedback' | 'Unsupported';

export function useSpeech() {
  const [status, setStatus] = useState<SpeechStatus>('Speech stopped');
  const { voiceSpeed } = useAccessibilityStore();
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (synth && synth.speaking) {
      synth.cancel();
    }
    setStatus('Speech stopped');
  }, [synth]);

  const speak = useCallback(
    (text: string, context: SpeechStatus) => {
      if (!synth) {
        setStatus('Unsupported');
        return;
      }

      // Stop any current speech
      stop();

      // Process text for MathML/LaTeX accessible reading
      const processedText = parseMathToSpeech(text);
      const utterance = new SpeechSynthesisUtterance(processedText);

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
    [synth, voiceSpeed, stop]
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
