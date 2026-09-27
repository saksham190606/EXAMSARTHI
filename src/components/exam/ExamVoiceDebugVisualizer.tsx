"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { VoiceStatus } from '@/hooks/useVoiceMode';

export interface ExamVoiceDebugVisualizerProps {
  status?: VoiceStatus;
  isActive?: boolean;
  isSpeaking?: boolean;
  lastCommand?: string | null;
  lastTranscript?: string | null;
  lastHeardTranscript?: string | null;
  voiceStatus?: string | null;
  onEnableMic?: () => void;
  className?: string;
  onClick?: () => void;
}

export function ExamVoiceDebugVisualizer({
  status = 'Listening',
  isActive = true,
  isSpeaking = false,
  lastCommand,
  lastTranscript,
  lastHeardTranscript,
  voiceStatus,
  onEnableMic,
  className,
  onClick,
}: ExamVoiceDebugVisualizerProps) {
  const currentVoiceStatus = voiceStatus || (isActive ? (status === 'Speaking' ? 'Reading question...' : 'Listening...') : 'Voice Muted');
  const transcriptToDisplay = lastHeardTranscript || lastTranscript || lastCommand;

  let icon = "🎙️";
  let colorScheme = "bg-neutral-950/90 text-[#ffed00] border-[#ffed00]/50 shadow-[0_0_14px_rgba(255,237,0,0.3)]";

  if (!isActive) {
    icon = "🔴";
    colorScheme = "bg-muted/70 text-muted-foreground border-border";
  } else if (isSpeaking || status === 'Speaking') {
    icon = "🔊";
    colorScheme = "bg-sky-950/80 text-sky-300 border-sky-400/60 shadow-[0_0_16px_rgba(56,189,248,0.35)] animate-pulse";
  } else if (currentVoiceStatus.includes('Error') || status === 'Error') {
    icon = "⚠️";
    colorScheme = "bg-rose-950/80 text-rose-300 border-rose-500/60 shadow-[0_0_14px_rgba(244,63,94,0.35)]";
  } else if (transcriptToDisplay) {
    icon = "💬";
    colorScheme = "bg-emerald-950/80 text-emerald-300 border-emerald-400/60 shadow-[0_0_16px_rgba(16,185,129,0.35)]";
  }

  return (
    <div className={cn("inline-flex flex-wrap items-center gap-2", className)}>
      {/* 1. Dedicated On-Screen Visual Debug Badge */}
      <div
        role="status"
        aria-live="polite"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium border backdrop-blur-md transition-all select-none",
          colorScheme,
          onClick && "cursor-pointer hover:opacity-90"
        )}
        title="Voice Diagnostic Status (Click to toggle voice)"
      >
        <span className="shrink-0 text-xs" aria-hidden="true">{icon}</span>
        <span className="font-bold">Status:</span>
        <span className="truncate max-w-[180px] sm:max-w-[240px]">{currentVoiceStatus}</span>
        {transcriptToDisplay ? (
          <>
            <span className="text-muted-foreground/60">|</span>
            <span className="font-bold text-emerald-400">Heard:</span>
            <span className="truncate max-w-[140px] sm:max-w-[200px] text-emerald-300 font-semibold">
              &ldquo;{transcriptToDisplay}&rdquo;
            </span>
          </>
        ) : (
          <>
            <span className="text-muted-foreground/60">|</span>
            <span className="text-muted-foreground text-2xs">Heard: None</span>
          </>
        )}
      </div>
    </div>
  );
}
