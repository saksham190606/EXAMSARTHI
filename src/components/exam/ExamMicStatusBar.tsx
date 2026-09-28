"use client";

import React from 'react';
import { Mic, MicOff, AlertCircle, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceStatus } from '@/hooks/useVoiceMode';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { cn } from '@/lib/utils';

export interface ExamMicStatusBarProps {
  isActive: boolean;
  status: VoiceStatus;
  isSpeaking?: boolean;
  lastCommand: string | null;
  lastTranscript?: string | null;
  lastHeardTranscript?: string | null;
  voiceStatus?: string | null;
  lastActionFeedback?: string | null;
  errorMessage?: string | null;
  onToggle: () => void;
  onEnableMic?: () => void;
  className?: string;
}

export function ExamMicStatusBar({
  isActive,
  status,
  isSpeaking = false,
  lastCommand,
  lastTranscript,
  lastHeardTranscript,
  voiceStatus,
  lastActionFeedback,
  errorMessage,
  onToggle,
  onEnableMic,
  className,
}: ExamMicStatusBarProps) {
  const language = useAccessibilityStore((s) => s.language);
  const isHindi = language === 'hi';

  const transcript = lastHeardTranscript || lastTranscript || lastCommand;

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
  const speakingActive = isSpeaking || status === 'Speaking';
  const listeningActive = isActive && status === 'Listening' && !speakingActive;
  const processingActive = isActive && (status === 'Processing' || (Boolean(transcript) && !speakingActive));
  const isOffOrReady = !isActive || status === 'Error' || status === 'Ready';

  return (
    <div
      role="region"
      aria-label={isHindi ? "माइक्रोफ़ोन स्थिति बार" : "Microphone status bar"}
      className={cn(
        "w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-none border transition-all duration-200",
        speakingActive
          ? "bg-sky-950/40 border-sky-500/50 shadow-[0_0_18px_rgba(56,189,248,0.2)]"
          : listeningActive
          ? "bg-neutral-950/90 border-[#ffed00] shadow-[0_0_24px_rgba(255,237,0,0.25)] ring-1 ring-[#ffed00]/50"
          : processingActive
          ? "bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_18px_rgba(16,185,129,0.2)]"
          : "bg-card/90 border-border/80",
        className
      )}
    >
      {/* Left side: Real-time Debug Visualizer Status Pill */}
      <div className="flex items-center gap-3 min-w-0 flex-1 flex-wrap">
        {/* State 1: [ 🔇 Mic Paused (Speaking) ] */}
        {speakingActive && (
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex size-3.5 shrink-0 items-center justify-center">
              <span className="size-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
            </span>
            <span className="text-sm font-bold text-red-400 font-mono tracking-wide">
              [ 🔇 Mic Paused (Speaking) ]
            </span>
          </div>
        )}

        {/* State 2: [ 🎙️ Listening ] */}
        {listeningActive && (
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex size-3.5 shrink-0 items-center justify-center">
              <span className="absolute -inset-1 rounded-full bg-[#ffed00] animate-ping opacity-75" />
              <span className="size-3 rounded-full bg-[#ffed00] shadow-[0_0_10px_#ffed00]" />
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-sm font-black text-[#ffed00] tracking-wide font-mono">
                [ 🎙️ Listening ]
              </span>
            </div>
          </div>
        )}

        {/* State 3: 🟢 LAST HEARD / RECOGNIZED */}
        {processingActive && !speakingActive && (
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex size-3.5 shrink-0 items-center justify-center">
              <span className="size-3 rounded-full bg-emerald-400 ring-4 ring-emerald-400/30 shadow-[0_0_10px_#34d399]" />
            </span>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-sm font-bold text-emerald-400 font-mono">
                Last heard: &ldquo;{transcript}&rdquo;
              </span>
              {lastActionFeedback && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-[2px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {lastActionFeedback}
                </span>
              )}
            </div>
          </div>
        )}

        {/* State 4: 🔴 OFF / CLICK TO ENABLE */}
        {isOffOrReady && !speakingActive && (
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex size-3.5 shrink-0 items-center justify-center">
              <span className="size-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
            </span>
            <span className="text-sm font-semibold text-muted-foreground">
              {voiceStatus || (isHindi ? '🔴 वॉइस नेविगेशन: म्यूट' : '🔴 Voice Navigation: Muted')}
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

      {/* Right side: Action Buttons & Explicit Unlock */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {/* 2. Explicit User-Gesture Mic Unlock Button */}
        {onEnableMic && (!isActive || status === 'Error' || status === 'Ready') && (
          <button
            type="button"
            onClick={onEnableMic}
            className="px-3.5 py-1.5 bg-[#ffed00] hover:bg-[#e6d500] text-black font-bold rounded-lg shadow-md transition-all cursor-pointer text-xs flex items-center gap-1.5"
          >
            <Mic className="size-3.5 text-black" aria-hidden="true" />
            <span>Click to Enable Microphone</span>
          </button>
        )}

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
            isActive && listeningActive
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
