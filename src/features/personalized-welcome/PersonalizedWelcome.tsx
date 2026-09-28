"use client";

import React from 'react';
import { Volume2 } from 'lucide-react';
import { usePersonalizedWelcome } from './usePersonalizedWelcome';
import { useTranslation } from '@/lib/i18n';

export function PersonalizedWelcome() {
  const { replay, greetingText } = usePersonalizedWelcome();
  const { t } = useTranslation();

  if (!greetingText) {
    return null;
  }

  return (
    <button
      onClick={replay}
      className="inline-flex items-center justify-center p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={t('replayWelcome')}
      title={t('replayWelcome')}
    >
      <Volume2 className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
