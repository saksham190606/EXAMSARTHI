import React, { useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { announceToScreenReader } from '@/lib/useExamEngine';
import { useTranslation } from '@/lib/i18n';

interface ExamTimerProps {
  timeRemaining: number;
  tickTimer: () => void;
}

export function ExamTimer({ timeRemaining, tickTimer }: ExamTimerProps) {
  const { t, language } = useTranslation();
  const isHindi = language === 'hi';

  useEffect(() => {
    const timerId = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(timerId);
  }, [tickTimer]);

  useEffect(() => {
    // Screen reader announcements at specific milestone intervals to avoid speech spam
    if (timeRemaining === 600) {
      announceToScreenReader(isHindi ? "10 मिनट शेष हैं।" : "10 minutes remaining.");
    } else if (timeRemaining === 300) {
      announceToScreenReader(isHindi ? "5 मिनट शेष हैं।" : "5 minutes remaining.");
    } else if (timeRemaining === 60) {
      announceToScreenReader(isHindi ? "1 मिनट शेष है। कृपया परीक्षा समाप्त करें।" : "1 minute remaining. Please finish your test.");
    }
  }, [timeRemaining, isHindi]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const isLowTime = timeRemaining <= 300; // <= 5 mins

  return (
    <div 
      className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg border font-mono transition-colors ${
        isLowTime 
          ? 'bg-destructive/10 text-destructive border-destructive/30 font-bold' 
          : 'bg-card text-foreground border-border font-semibold shadow-2xs'
      }`}
      aria-live="off" // Prevent announcing every second; milestone intervals are announced above
    >
      {isLowTime ? (
        <AlertTriangle className="size-4 text-destructive shrink-0" aria-hidden="true" />
      ) : (
        <Clock className="size-4 text-primary shrink-0" aria-hidden="true" />
      )}
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-sans font-medium hidden sm:inline">
        {isLowTime ? t('lowTimeWarning') : t('timeLeft')}
      </span>
      <span 
        className="text-base sm:text-lg tabular-nums tracking-tight"
        aria-label={`${minutes} minutes and ${seconds} seconds remaining`}
      >
        {formattedTime}
      </span>
    </div>
  );
}
