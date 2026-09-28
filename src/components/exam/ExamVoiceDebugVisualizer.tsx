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

/**
 * 4. UI Diagnostics & Manual Recovery Banner
 * - If permission is missing or blocked: Render a high-visibility button [ 🎙️ Tap to Enable Voice & Mic ]
 * - When active: Pulsing Sunlight Yellow (#ffed00) pill showing 🎙️ Listening | Heard: "[transcript]"
 * - If speaking: 🔊 Reading Question...
 */
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
  const transcriptToDisplay = lastHeardTranscript || lastTranscript || lastCommand;

  // 1. If permission is missing, blocked, or in error:
  if ((!isActive || status === 'Error' || status === 'Ready') && onEnableMic) {
    return (
      <button
        type="button"
        onClick={onEnableMic}
        className={cn(
          "px-4 py-2 bg-[#ffed00] hover:bg-[#e6d500] text-black font-bold rounded-lg shadow-md transition cursor-pointer text-xs sm:text-sm animate-pulse flex items-center gap-2 select-none",
          className
        )}
      >
        <span aria-hidden="true">🎙️</span>
        <span>Tap to Enable Voice &amp; Mic</span>
      </button>
    );
  }

  // 2. If speaking: [ 🔇 Mic Paused (Speaking) ]
  if (isSpeaking || status === 'Speaking') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold bg-neutral-900/95 text-red-400 border-2 border-red-500/70 shadow-[0_0_16px_rgba(239,68,68,0.35)] select-none",
          className
        )}
      >
        <span className="text-sm" aria-hidden="true">🔇</span>
        <span>[ 🔇 Mic Paused (Speaking) ]</span>
      </div>
    );
  }

  // 3. When active: Pulsing Sunlight Yellow (#ffed00) pill showing [ 🎙️ Listening ]
  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold bg-neutral-950/90 text-[#ffed00] border-2 border-[#ffed00] shadow-[0_0_18px_rgba(255,237,0,0.35)] animate-pulse select-none cursor-pointer hover:bg-[#ffed00]/10 transition-all",
        className
      )}
      title="Voice Listening. Click to toggle"
    >
      <span className="relative flex size-2.5 items-center justify-center">
        <span className="absolute -inset-1 rounded-full animate-ping opacity-75 bg-[#ffed00]" />
        <span className="size-2 rounded-full bg-[#ffed00]" />
      </span>
      <span className="truncate max-w-[240px] sm:max-w-md">
        [ 🎙️ Listening ]{transcriptToDisplay ? ` | Heard: "${transcriptToDisplay}"` : ''}
      </span>
    </div>
  );
}
