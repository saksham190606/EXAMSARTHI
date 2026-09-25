import { useCallback } from 'react';
import { useSpeech } from './useSpeech';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';

export function useVoiceFeedback() {
  const { speak, stop } = useSpeech();
  const voiceFeedbackEnabled = useAccessibilityStore(state => state.voiceFeedback);

  const speakFeedback = useCallback((text: string) => {
    if (!voiceFeedbackEnabled) return;
    
    // Use the 'Voice feedback' context to let useSpeech handle it.
    // useSpeech internally calls stop() to cancel any previous utterance.
    speak(text, 'Voice feedback');
  }, [speak, voiceFeedbackEnabled]);

  return { speakFeedback, stopFeedback: stop };
}
