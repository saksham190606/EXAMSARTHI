"use client";

import React from 'react';
import { Mic, MicOff, AlertCircle, Radio, CheckCircle, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceStatus } from '@/hooks/useVoiceMode';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { cn } from '@/lib/utils';

export interface ExamMicStatusBarProps {
  isActive: boolean;
  status: VoiceStatus;
  lastCommand: string | null;
  lastActionFeedback?: string | null;
  errorMessage?: string | null;
  onToggle: () => void;
  className?: string;
}

export function ExamMicStatusBar({
  isActive,
  status,
  lastCommand,
  lastActionFeedback,
  errorMessage,
  onToggle,
  className,
}: ExamMicStatusBarProps) {
  const language = useAccessibilityStore((s) => s.language);
  const isHindi = language === 'hi';

  // 1. Browser Mismatch / Unsupported Banner
  if (status === 'Unsupported') {
    return (
      <aside
        role="alert"
        aria-live="assertive"
        className={cn(
          "w-full flex items-center justify-between gap-3 px-4 py-3 bg-amber-500/10 border-2 border-amber-500/40 rounded-none text-foreground text-sm",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <AlertCircle className="size-5 text-amber-500 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold text-amber-600 dark:text-amber-400">
              {isHindi ? 'ब्राउज़र में वॉइस रिकॉग्निशन उपलब्ध नहीं है' : 'Voice Recognition Unsupported in this Browser'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isHindi 
                ? 'कृपया Google Chrome या Microsoft Edge का उपयोग करें। आप Alt+N, Alt+P और 1-4 कीबोर्ड शॉर्टकट से परीक्षा दे सकते हैं।' 
                : 'Please use Google Chrome or Microsoft Edge for voice interaction. You can continue comfortably using keyboard shortcuts (Alt+N, Alt+P, 1-4).'}
            </p>
          </div>
        </div>
      </aside>
    );
  }

  // 2. Microphone Active / Inactive States
  const isListening = isActive && status === 'Listening';
  const isProcessing = isActive && (status === 'Processing' || (Boolean(lastCommand) && status !== 'Speaking'));
  const isSpeaking = isActive && status === 'Speaking';
  const isOffOrReady = !isActive;

  return (
    <div
      role="region"
      aria-label={isHindi ? "माइक्रोफ़ोन स्थिति बार" : "Microphone status bar"}
      className={cn(
        "w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-none border transition-all duration-200",
        isListening
          ? "bg-neutral-950/90 border-[#ffed00] shadow-[0_0_24px_rgba(255,237,0,0.25)] ring-1 ring-[#ffed00]/50"
          : isProcessing
          ? "bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_18px_rgba(16,185,129,0.2)]"
          : isSpeaking
          ? "bg-primary/10 border-primary/40 shadow-xs"
          : "bg-card/90 border-border/80",
        className
      )}
    >
      {/* Left side: Status Indicator */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* State 1: 🟡 LISTENING */}
        {isListening && (
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex size-3.5 shrink-0 items-center justify-center">
              <span className="absolute -inset-1 rounded-full bg-[#ffed00] animate-ping opacity-75" />
              <span className="size-3 rounded-full bg-[#ffed00] shadow-[0_0_10px_#ffed00]" />
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-sm font-black text-[#ffed00] tracking-wide uppercase font-mono">
                {isHindi ? '🟡 कमांड सुन रहा है...' : '🟡 Listening for commands...'}
              </span>
              <span className="text-xs text-muted-foreground hidden md:inline">
                {isHindi ? '(A, B, C, D या अगला/पिछला बोलें)' : '(Say "Option A", "B", "Next", or "Previous")'}
              </span>
            </div>
          </div>
        )}

        {/* State 2: 🟢 RECOGNIZED */}
        {isProcessing && (
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex size-3.5 shrink-0 items-center justify-center">
              <span className="size-3 rounded-full bg-emerald-400 ring-4 ring-emerald-400/30 shadow-[0_0_10px_#34d399]" />
            </span>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-sm font-bold text-emerald-400">
                {isHindi ? `🟢 पहचाना गया: "${lastCommand}"` : `🟢 Recognized: "${lastCommand}"`}
              </span>
              {lastActionFeedback && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-[2px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {lastActionFeedback}
                </span>
              )}
            </div>
          </div>
        )}

        {/* State 3: 🔵 SPEAKING (TALKBACK) */}
        {isSpeaking && (
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex size-3.5 shrink-0 items-center justify-center">
              <Volume2 className="size-4 text-primary animate-pulse" />
            </span>
            <span className="text-sm font-semibold text-primary">
              {isHindi ? '🔵 बोल रहा है (स्क्रीन रीडर)...' : '🔵 Speaking (Screen Reader)...'}
            </span>
          </div>
        )}

        {/* State 4: 🔴 OFF / CLICK TO ENABLE */}
        {isOffOrReady && (
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex size-3.5 shrink-0 items-center justify-center">
              <span className="size-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
            </span>
            <span className="text-sm font-semibold text-muted-foreground">
              {isHindi ? '🔴 माइक्रोफ़ोन: बंद / चालू करने के लिए क्लिक करें' : '🔴 Microphone: Off / Click to Enable'}
            </span>
          </div>
        )}

        {/* Error notification if permission denied or mic failure */}
        {errorMessage && !isActive && (
          <span className="text-xs text-destructive font-medium truncate max-w-xs sm:max-w-md">
            ({errorMessage})
          </span>
        )}
      </div>

      {/* Right side: Action Toggle Button & Shortcut hint */}
      <div className="flex items-center gap-2 shrink-0">
        <kbd 
          className="hidden sm:inline-flex items-center px-2 py-1 text-2xs font-mono font-bold bg-muted/60 text-muted-foreground border border-border rounded-[2px]"
          title="Keyboard Shortcut"
        >
          Alt + M
        </kbd>

        <Button
          type="button"
          size="sm"
          variant={isActive ? "secondary" : "default"}
          onClick={onToggle}
          disabled={status === 'RequestingPermission'}
          className={cn(
            "h-8 px-3 text-xs font-bold gap-1.5 transition-all",
            isActive && isListening
              ? "bg-[#ffed00] hover:bg-[#ffed00]/90 text-black border-[#ffed00] shadow-[0_0_12px_rgba(255,237,0,0.4)]"
              : isActive
              ? "border-border"
              : "border-primary"
          )}
          aria-label={
            isActive 
              ? (isHindi ? "माइक्रोफ़ोन बंद करें (Alt+M)" : "Disable microphone (Alt+M)")
              : (isHindi ? "माइक्रोफ़ोन चालू करें (Alt+M)" : "Enable microphone (Alt+M)")
          }
        >
          {status === 'RequestingPermission' ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              <span>{isHindi ? 'अनुमति मांग रहे हैं...' : 'Requesting Mic...'}</span>
            </>
          ) : isActive ? (
            <>
              <MicOff className="size-3.5" aria-hidden="true" />
              <span>{isHindi ? 'माइक बंद करें' : 'Mute Mic'}</span>
            </>
          ) : (
            <>
              <Mic className="size-3.5" aria-hidden="true" />
              <span>{isHindi ? 'माइक चालू करें' : 'Enable Mic'}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
