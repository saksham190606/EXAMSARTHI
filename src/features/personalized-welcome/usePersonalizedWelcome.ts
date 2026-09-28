import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { useSpeech } from '@/hooks/useSpeech';
import { useTranslation } from '@/lib/i18n';
import { getTimeOfDayKey, buildGreetingText } from './greetingUtils';

const SESSION_STORAGE_KEY = 'examsarthi_welcome_played';

export function usePersonalizedWelcome() {
  const { profile, user, loading } = useAuth();
  const { audioAssistance } = useAccessibilityStore();
  const { speak } = useSpeech();
  const { t } = useTranslation();

  const hasAttemptedRef = useRef(false);
  const [greetingText, setGreetingText] = useState<string>('');

  const candidateName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Candidate";
  const hasName = Boolean(candidateName);

  const getGreeting = useCallback(() => {
    const timeKey = getTimeOfDayKey();
    return buildGreetingText(timeKey, candidateName, t);
  }, [candidateName, t]);

  useEffect(() => {
    if (loading || !user) return;

    const text = getGreeting();
    setGreetingText(text);

    if (typeof window !== 'undefined') {
      const alreadyPlayed = sessionStorage.getItem(SESSION_STORAGE_KEY);

      if (!alreadyPlayed) {
        let isHandling = false;

        const handleInteraction = () => {
          if (isHandling) return;
          isHandling = true;

          window.removeEventListener('keydown', handleInteraction);
          window.removeEventListener('click', handleInteraction);
          window.removeEventListener('touchstart', handleInteraction);

          const currentAudioAssistance = useAccessibilityStore.getState().audioAssistance;

          if (currentAudioAssistance) {
            const isHindi = document.documentElement.lang === 'hi';
            const onboarding = isHindi
              ? ' सारथी आपका पहुंच सहायक है। मदद के लिए कभी भी Alt और S दबाएं।'
              : ' Sarthi is your accessibility assistant. Press Alt plus S anytime to ask Sarthi for help.';
            const finalWelcomeText = text + onboarding;

            speak(finalWelcomeText, 'Voice feedback', {
              onStart: () => {
                sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
              },
              onError: (e) => {
                if (e.error === 'not-allowed') {
                  // Browser still blocked it, allow another attempt
                  isHandling = false;
                  window.addEventListener('keydown', handleInteraction);
                  window.addEventListener('click', handleInteraction);
                  window.addEventListener('touchstart', handleInteraction);
                }
              }
            });
          } else {
            // Audio assistance disabled, mark as played so it doesn't suddenly speak later
            sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
          }
        };

        window.addEventListener('keydown', handleInteraction);
        window.addEventListener('click', handleInteraction);
        window.addEventListener('touchstart', handleInteraction);

        return () => {
          window.removeEventListener('keydown', handleInteraction);
          window.removeEventListener('click', handleInteraction);
          window.removeEventListener('touchstart', handleInteraction);
        };
      }
    }
  }, [getGreeting, speak, loading, user]);

  const replay = useCallback(() => {
    const text = getGreeting();
    speak(text, 'Voice feedback');
  }, [getGreeting, speak]);

  return { replay, hasName, greetingText };
}
