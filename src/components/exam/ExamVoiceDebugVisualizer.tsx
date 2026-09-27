"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { VoiceStatus } from '@/hooks/useVoiceMode';

export interface ExamVoiceDebugVisualizerProps {
  status: VoiceStatus;
  isActive: boolean;
  isSpeaking: boolean;
  lastCommand?: string | null;
  lastTranscript?: string | null;
  className?: string;
  onClick?: () => void;
}

export function ExamVoiceDebugVisualizer({
  status,
  isActive,
  isSpeaking,
  lastCommand,
  lastTranscript,
  className,
  onClick,
}: ExamVoiceDebugVisualizerProps) {
  const transcriptToDisplay = lastTranscript || lastCommand;

  let icon = "🎙️";
  let label = "Listening... (Say 'A', 'B', 'Next')";
  let colorScheme = "bg-neutral-950/90 text-[#ffed00] border-[#ffed00]/50 shadow-[0_0_14px_rgba(255,237,0,0.3)]";

  if (!isActive) {
    icon = "🔴";
    label = "Voice Muted (Alt+M)";
    colorScheme = "bg-muted/70 text-muted-foreground border-border";
  } else if (isSpeaking || status === 'Speaking') {
    icon = "🔊";
    label = "Reading question...";
    colorScheme = "bg-sky-950/80 text-sky-300 border-sky-400/60 shadow-[0_0_16px_rgba(56,189,248,0.35)] animate-pulse";
  } else if (transcriptToDisplay && (status === 'Processing' || status === 'Listening')) {
    icon = "💬";
    label = `Last heard: "${transcriptToDisplay}"`;
    colorScheme = "bg-emerald-950/80 text-emerald-300 border-emerald-400/60 shadow-[0_0_16px_rgba(16,185,129,0.35)]";
  }

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-semibold border backdrop-blur-md transition-all duration-200 select-none",
        colorScheme,
        onClick && "cursor-pointer hover:opacity-90",
        className
      )}
      title="Exam Voice Engine Real-time Status (Click to toggle)"
    >
      <span className="shrink-0 text-sm leading-none" aria-hidden="true">{icon}</span>
      <span className="truncate max-w-[200px] sm:max-w-[280px] md:max-w-[340px] tracking-tight">
        {label}
      </span>
    </div>
  );
}
