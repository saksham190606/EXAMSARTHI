import React, { useEffect } from 'react';
import { Clock, AlertTriangle, Layers } from 'lucide-react';
import { announceToScreenReader } from '@/lib/useExamEngine';
import { useTranslation } from '@/lib/i18n';

interface ExamTimerProps {
  timeRemaining: number;
  tickTimer: () => void;
  sectionTimeRemaining?: number;
  sectionName?: string;
  hasSections?: boolean;
}

export function ExamTimer({ 
  timeRemaining, 
  tickTimer, 
  sectionTimeRemaining, 
  sectionName, 
  hasSections 
}: ExamTimerProps) {
  const { t, language } = useTranslation();
  const isHindi = language === 'hi';

  useEffect(() => {
    const timerId = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(timerId);
  }, [tickTimer]);

  // Overall milestone announcements
  useEffect(() => {
    if (!hasSections) {
      if (timeRemaining === 600) {
        announceToScreenReader(isHindi ? "10 मिनट शेष हैं।" : "10 minutes remaining.");
      } else if (timeRemaining === 300) {
        announceToScreenReader(isHindi ? "5 मिनट शेष हैं।" : "5 minutes remaining.");
      } else if (timeRemaining === 60) {
        announceToScreenReader(isHindi ? "1 मिनट शेष है। कृपया परीक्षा समाप्त करें।" : "1 minute remaining. Please finish your test.");
      }
    }
  }, [timeRemaining, isHindi, hasSections]);

  // Section milestone announcements
  useEffect(() => {
    if (hasSections && sectionTimeRemaining !== undefined) {
      if (sectionTimeRemaining === 120) {
        announceToScreenReader(
          isHindi 
            ? `${sectionName || 'इस सेक्शन'} में 2 मिनट शेष हैं।` 
            : `2 minutes remaining in ${sectionName || 'this section'}.`
        );
      } else if (sectionTimeRemaining === 60) {
        announceToScreenReader(
          isHindi 
            ? `चेतावनी: ${sectionName || 'इस सेक्शन'} में केवल 1 मिनट शेष है। समय समाप्त होने पर अगला सेक्शन स्वतः शुरू हो जाएगा।` 
            : `Warning: 1 minute remaining in ${sectionName || 'this section'}. The next section will auto-advance when time expires.`
        );
      } else if (sectionTimeRemaining === 30) {
        announceToScreenReader(
          isHindi 
            ? `30 सेकंड शेष हैं।` 
            : `30 seconds remaining.`
        );
      }
    }
  }, [sectionTimeRemaining, sectionName, isHindi, hasSections]);

  const totalMinutes = Math.floor(timeRemaining / 60);
  const totalSeconds = timeRemaining % 60;
  const formattedTotalTime = `${totalMinutes.toString().padStart(2, '0')}:${totalSeconds.toString().padStart(2, '0')}`;

  const secMinutes = sectionTimeRemaining !== undefined ? Math.floor(sectionTimeRemaining / 60) : 0;
  const secSeconds = sectionTimeRemaining !== undefined ? sectionTimeRemaining % 60 : 0;
  const formattedSectionTime = `${secMinutes.toString().padStart(2, '0')}:${secSeconds.toString().padStart(2, '0')}`;

  const isSectionLowTime = sectionTimeRemaining !== undefined && sectionTimeRemaining <= 60;
  const isOverallLowTime = timeRemaining <= 300;

  if (hasSections && sectionTimeRemaining !== undefined) {
    return (
      <div className="flex items-center gap-2" role="region" aria-label="Exam and Section Timers">
        {/* Active Section Timer (Prominent) */}
        <div 
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono transition-colors ${
            isSectionLowTime 
              ? 'bg-destructive/10 text-destructive border-destructive/40 font-bold animate-pulse' 
              : 'bg-primary/10 text-primary border-primary/30 font-semibold shadow-2xs'
          }`}
          aria-live="off"
        >
          {isSectionLowTime ? (
            <AlertTriangle className="size-4 text-destructive shrink-0" aria-hidden="true" />
          ) : (
            <Clock className="size-4 text-primary shrink-0" aria-hidden="true" />
          )}
          <span className="text-xs uppercase tracking-wider font-sans font-medium hidden sm:inline text-foreground">
            {sectionName ? `${sectionName}:` : 'Section:'}
          </span>
          <span 
            className="text-base sm:text-lg tabular-nums tracking-tight font-bold"
            aria-label={`${secMinutes} minutes and ${secSeconds} seconds remaining in ${sectionName || 'section'}`}
          >
            {formattedSectionTime}
          </span>
        </div>

        {/* Total Exam Timer (Compact secondary) */}
        <div 
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-xs ${
            isOverallLowTime
              ? 'bg-muted/80 text-destructive border-destructive/20 font-medium'
              : 'bg-muted/40 text-muted-foreground border-border font-medium'
          }`}
          aria-live="off"
          title="Overall Exam Remaining Time"
        >
          <Layers className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
          <span className="font-sans text-2xs uppercase tracking-wider">Total:</span>
          <span className="tabular-nums font-semibold">{formattedTotalTime}</span>
        </div>
      </div>
    );
  }

  // Fallback: Non-sectional exam timer (exam-level only)
  return (
    <div 
      className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg border font-mono transition-colors ${
        isOverallLowTime 
          ? 'bg-destructive/10 text-destructive border-destructive/30 font-bold' 
          : 'bg-card text-foreground border-border font-semibold shadow-2xs'
      }`}
      aria-live="off"
    >
      {isOverallLowTime ? (
        <AlertTriangle className="size-4 text-destructive shrink-0" aria-hidden="true" />
      ) : (
        <Clock className="size-4 text-primary shrink-0" aria-hidden="true" />
      )}
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-sans font-medium hidden sm:inline">
        {isOverallLowTime ? t('lowTimeWarning') : t('timeLeft')}
      </span>
      <span 
        className="text-base sm:text-lg tabular-nums tracking-tight"
        aria-label={`${totalMinutes} minutes and ${totalSeconds} seconds remaining`}
      >
        {formattedTotalTime}
      </span>
    </div>
  );
}
