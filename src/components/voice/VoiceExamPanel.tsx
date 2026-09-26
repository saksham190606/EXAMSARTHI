import React from 'react';
import {
  Mic,
  MicOff,
  AlertCircle,
  Volume2,
  CheckCircle2,
  Radio,
  Loader2,
  ShieldCheck,
  BookmarkCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { VoiceStatus } from '@/hooks/useVoiceMode';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface VoiceExamPanelProps {
  isActive: boolean;
  status: VoiceStatus;
  lastCommand: string | null;
  lastActionFeedback?: string | null;
  errorMessage?: string | null;
  onToggle: () => void;
}

export function VoiceExamPanel({ 
  isActive, 
  status, 
  lastCommand, 
  lastActionFeedback,
  errorMessage, 
  onToggle 
}: VoiceExamPanelProps) {
  const { t, language } = useTranslation();
  const isHindi = language === 'hi';

  if (status === 'Unsupported') {
    return (
      <Card className="border border-border/80 bg-muted/20 shadow-none">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertCircle className="size-5 text-muted-foreground shrink-0" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-foreground">
              {t('statusUnavailable')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('statusUnavailableDesc')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderStatusBadge = () => {
    if (status === 'RequestingPermission') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <Loader2 className="size-3 animate-spin" aria-hidden="true" />
          <span>{t('statusRequestingPermission')}</span>
        </span>
      );
    }

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
    <Card className={cn(
      "border transition-colors shadow-xs",
      isActive ? "border-primary/40 bg-card" : "border-border bg-card"
    )}>
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Top Control & Status Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button 
              variant={isActive ? "default" : "outline"} 
              size="sm"
              onClick={onToggle}
              disabled={status === 'RequestingPermission'}
              aria-pressed={isActive}
              className={cn(
                "h-9 px-3.5 font-medium gap-2 transition-all",
                isActive ? "shadow-2xs" : "border-border"
              )}
            >
              {status === 'RequestingPermission' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : isActive ? (
                <Mic className="size-4" aria-hidden="true" />
              ) : (
                <MicOff className="size-4" aria-hidden="true" />
              )}
              <span>
                {status === 'RequestingPermission'
                  ? t('statusRequestingPermission')
                  : isActive
                  ? t('voiceModeActive')
                  : t('enableVoiceMode')}
              </span>
            </Button>
            
            <div className="flex items-center gap-2" aria-live="polite">
              {renderStatusBadge()}
            </div>
          </div>

          {/* Last command feedback */}
          {isActive && (lastActionFeedback || lastCommand) && (
            <div 
              aria-live="polite"
              className="text-xs font-mono bg-muted/60 px-3 py-1.5 rounded border max-w-full sm:max-w-xs truncate flex items-center gap-1.5"
            >
              {lastActionFeedback ? (
                <span className="font-semibold font-sans text-primary flex items-center gap-1 truncate">
                  {lastActionFeedback}
                </span>
              ) : (
                <>
                  <span className="font-semibold font-sans text-foreground mr-1 shrink-0">{t('lastCommand')}</span>
                  <span className="text-muted-foreground truncate">&quot;{lastCommand}&quot;</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Error notification banner if permission was denied or microphone failed */}
        {(status === 'Error' || errorMessage) && (
          <div 
            role="alert" 
            className="flex items-start gap-2.5 p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive"
          >
            <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                {t('statusError')} — Seamless Keyboard Fallback Active
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {errorMessage || t('voiceMicDeniedError')}
              </p>
              <p className="text-emerald-700 dark:text-emerald-400 font-medium text-2xs flex items-center gap-1 pt-0.5">
                <BookmarkCheck className="size-3" aria-hidden="true" />
                <span>Your exam answers and timer are safe. Keyboard controls (Tab, Arrow keys, 1-4, Enter) remain active.</span>
              </p>
            </div>
          </div>
        )}

        {/* Privacy & Accessibility Description Note */}
        <div className="flex items-center gap-2 text-2xs text-muted-foreground pt-1">
          <ShieldCheck className="size-3.5 text-primary/70 shrink-0" aria-hidden="true" />
          <span>{isActive ? t('voicePrivacyActive') : t('voicePrivacyInactive')}</span>
        </div>

        {/* Supported Commands Guide */}
        {isActive && (
          <div className="pt-3 border-t border-border/40 space-y-2 text-xs">
            <span className="font-semibold text-foreground uppercase tracking-wider text-2xs block">
              {t('supportedVoiceCommands')}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
              <span className="mr-1">{t('voiceSelectLabel')}</span>
              <kbd className="px-2 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">
                {isHindi ? '"विकल्प बी" / "2"' : '"Option B" / "2"'}
              </kbd>
              <span className="mx-1">·</span>
              <span className="mr-1">{t('voiceNavigateLabel')}</span>
              <kbd className="px-2 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">
                {isHindi ? '"अगला"' : '"Next"'}
              </kbd>
              <kbd className="px-2 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">
                {isHindi ? '"पिछला"' : '"Previous"'}
              </kbd>
              <kbd className="px-2 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">
                {isHindi ? '"अगला सेक्शन"' : '"Next Section"'}
              </kbd>
              <kbd className="px-2 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">
                {isHindi ? '"वर्तमान सेक्शन"' : '"Current Section"'}
              </kbd>
              <span className="mx-1">·</span>
              <span className="mr-1">{t('voiceAudioLabel')}</span>
              <kbd className="px-2 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">
                {isHindi ? '"सवाल पढ़ो"' : '"Read Question"'}
              </kbd>
              <kbd className="px-2 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">
                {isHindi ? '"सब पढ़ो"' : '"Read Everything"'}
              </kbd>
              <span className="mx-1">·</span>
              <span className="mr-1">{t('voiceFlagLabel')}</span>
              <kbd className="px-2 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">
                {isHindi ? '"चिन्हित करो"' : '"Flag Question"'}
              </kbd>
              <span className="mx-1">·</span>
              <span className="mr-1">{t('voiceTimeSubmitLabel')}</span>
              <kbd className="px-2 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">
                {isHindi ? '"समय"' : '"Time left"'}
              </kbd>
              <kbd className="px-2 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">
                {isHindi ? '"परीक्षा जमा करो"' : '"Submit Exam"'}
              </kbd>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
