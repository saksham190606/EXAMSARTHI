import React from 'react';
import {
  Mic,
  MicOff,
  AlertCircle,
  Volume2,
  CheckCircle2,
  Radio,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import { VoiceStatus } from '@/hooks/useVoiceMode';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface VoiceExamPanelProps {
  isActive: boolean;
  status: VoiceStatus;
  lastCommand: string | null;
  onToggle: () => void;
}

export function VoiceExamPanel({ isActive, status, lastCommand, onToggle }: VoiceExamPanelProps) {
  const { t, language } = useTranslation();
  const isHindi = language === 'hi';

  if (status === 'Unsupported') {
    return (
      <div className="border-b border-border/50 bg-muted/20 p-4 flex items-center gap-3">
        <AlertCircle className="size-5 text-muted-foreground shrink-0" aria-hidden="true" />
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground">
            {t('statusUnavailable')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('statusUnavailableDesc')}
          </p>
        </div>
      </div>
    );
  }

  const renderStatusBadge = () => {
    if (!isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-muted text-muted-foreground border border-border">
          <MicOff className="size-3" aria-hidden="true" />
          <span>{t('statusOff')}</span>
        </span>
      );
    }

    switch (status) {
      case 'Listening':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/30">
            <Radio className="size-3 motion-safe:animate-pulse" aria-hidden="true" />
            <span>{t('statusListening')}</span>
          </span>
        );
      case 'Processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-secondary text-secondary-foreground border border-border">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            <span>{t('statusProcessing')}</span>
          </span>
        );
      case 'Speaking':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
            <Volume2 className="size-3" aria-hidden="true" />
            <span>{t('statusSpeaking')}</span>
          </span>
        );
      case 'Error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle className="size-3" aria-hidden="true" />
            <span>{t('statusError')}</span>
          </span>
        );
      case 'Ready':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-muted text-foreground border border-border">
            <CheckCircle2 className="size-3 text-primary" aria-hidden="true" />
            <span>{t('statusReady')}</span>
          </span>
        );
    }
  };

  return (
    <div className={cn(
      "border-b border-border/50 transition-colors",
      isActive ? "bg-primary/5" : "bg-card"
    )}>
      <div className="p-4 sm:px-6 sm:py-4 flex flex-col gap-3">
        {/* Top Control & Status Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button 
              variant={isActive ? "default" : "outline"} 
              size="sm"
              onClick={onToggle}
              aria-pressed={isActive}
              className={cn(
                "h-9 px-3.5 font-medium gap-2 transition-all",
                isActive ? "shadow-2xs" : "border-border"
              )}
            >
              {isActive ? <Mic className="size-4" aria-hidden="true" /> : <MicOff className="size-4" aria-hidden="true" />}
              <span>{isActive ? t('voiceModeActive') : t('enableVoiceMode')}</span>
            </Button>
            
            <div className="flex items-center gap-2" aria-live="polite">
              {renderStatusBadge()}
            </div>
          </div>

          {/* Last command feedback */}
          {isActive && lastCommand && (
            <div className="text-xs text-muted-foreground font-mono bg-muted/50 px-2.5 py-1 rounded border max-w-full sm:max-w-xs truncate">
              <span className="font-semibold font-sans text-foreground mr-1">{t('lastCommand')}</span>
              &quot;{lastCommand}&quot;
            </div>
          )}
        </div>

        {/* Compact Supported Commands Guide */}
        {isActive && (
          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-foreground">Say:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">
              {isHindi ? 'अगला' : 'Next'}
            </kbd>
            <span>·</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">
              {isHindi ? 'पिछला' : 'Previous'}
            </kbd>
            <span>·</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">
              {isHindi ? 'विकल्प ए-डी' : 'Option A-D'}
            </kbd>
            <span>·</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">
              {isHindi ? 'प्रश्न पढ़ो' : 'Read Question'}
            </kbd>
            <span>·</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">
              {isHindi ? 'रुको' : 'Stop'}
            </kbd>
          </div>
        )}
      </div>
    </div>
  );
}
