import { TranslationKey } from '@/lib/i18n';

export function getTimeOfDayKey(): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  const currentHour = new Date().getHours();
  if (currentHour >= 5 && currentHour < 12) {
    return 'goodMorning';
  } else if (currentHour >= 12 && currentHour < 17) {
    return 'goodAfternoon';
  } else {
    return 'goodEvening';
  }
}

export function buildGreetingText(
  timeKey: TranslationKey,
  name: string | null | undefined,
  t: (key: TranslationKey) => string
): string {
  const timeGreeting = t(timeKey);
  const welcome = t('welcomeToExamSarthi');

  if (name && name.trim().length > 0) {
    return `${timeGreeting}, ${name}. ${welcome}`;
  }

  return `${timeGreeting}. ${welcome}`;
}
