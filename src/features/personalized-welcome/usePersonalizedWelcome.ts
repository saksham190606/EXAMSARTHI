import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { useTranslation } from '@/lib/i18n';
import { getTimeOfDayKey, buildGreetingText } from './greetingUtils';
import { forceSpeak, voiceEngine } from '@/lib/accessibility/voice-companion';

export function usePersonalizedWelcome() {
  const { profile, user, loading } = useAuth();
  const { t } = useTranslation();

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
  }, [getGreeting, loading, user]);

  const replay = useCallback(() => {
    const isHindi = useAccessibilityStore.getState().language === 'hi';
    const welcomeAnnouncement = isHindi
      ? `एग्जामसारथी डैशबोर्ड में आपका स्वागत है, ${candidateName}। आप 'प्रैक्टिस', 'परीक्षा', 'परिणाम' या 'सेटिंग्स' बोल सकते हैं।`
      : `Welcome to ExamSarthi Dashboard, ${candidateName}. You can say 'Practice', 'Exams', 'Results', or 'Settings'.`;

    forceSpeak(welcomeAnnouncement, () => {
      voiceEngine.startAlwaysOnListening();
    }, isHindi ? 'hi-IN' : 'en-US');
  }, [candidateName]);

  return { replay, hasName, greetingText };
}
