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
import { Card, CardContent } from '@/components/ui/card';
import { VoiceStatus } from '@/hooks/useVoiceMode';
import { cn } from '@/lib/utils';

interface VoiceExamPanelProps {
  isActive: boolean;
  status: VoiceStatus;
  lastCommand: string | null;
  onToggle: () => void;
}

export function VoiceExamPanel({ isActive, status, lastCommand, onToggle }: VoiceExamPanelProps) {
  if (status === 'Unsupported') {
    return (
      <Card className="border border-border/80 bg-muted/20 shadow-none">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertCircle className="size-5 text-muted-foreground shrink-0" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-foreground">
              Voice Mode Unavailable
            </p>
            <p className="text-xs text-muted-foreground">
              Speech recognition is not supported in this browser. You can use full keyboard navigation.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderStatusBadge = () => {
    if (!isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-muted text-muted-foreground border border-border">
          <MicOff className="size-3" aria-hidden="true" />
          <span>OFF</span>
        </span>
      );
    }

    switch (status) {
      case 'Listening':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/30">
            <Radio className="size-3 motion-safe:animate-pulse" aria-hidden="true" />
            <span>Listening...</span>
          </span>
        );
      case 'Processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-secondary text-secondary-foreground border border-border">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            <span>Processing...</span>
          </span>
        );
      case 'Speaking':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
            <Volume2 className="size-3" aria-hidden="true" />
            <span>Speaking...</span>
          </span>
        );
      case 'Error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle className="size-3" aria-hidden="true" />
            <span>Voice Error</span>
          </span>
        );
      case 'Ready':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-muted text-foreground border border-border">
            <CheckCircle2 className="size-3 text-primary" aria-hidden="true" />
            <span>Ready</span>
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
              aria-pressed={isActive}
              className={cn(
                "h-9 px-3.5 font-medium gap-2 transition-all",
                isActive ? "shadow-2xs" : "border-border"
              )}
            >
              {isActive ? <Mic className="size-4" aria-hidden="true" /> : <MicOff className="size-4" aria-hidden="true" />}
              <span>{isActive ? 'Voice Mode: Active' : 'Enable Voice Mode'}</span>
            </Button>
            
            <div className="flex items-center gap-2" aria-live="polite">
              {renderStatusBadge()}
            </div>
          </div>

          {/* Last command feedback */}
          {isActive && lastCommand && (
            <div className="text-xs text-muted-foreground font-mono bg-muted/50 px-2.5 py-1 rounded border max-w-full sm:max-w-xs truncate">
              <span className="font-semibold font-sans text-foreground mr-1">Last Command:</span>
              &quot;{lastCommand}&quot;
            </div>
          )}
        </div>

        {/* Supported Commands Guide */}
        {isActive && (
          <div className="pt-3 border-t border-border/40 space-y-2 text-xs">
            <span className="font-semibold text-foreground uppercase tracking-wider text-2xs block">
              Supported Voice Commands
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
              <span className="mr-1">Select:</span>
              <kbd className="px-2 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">&quot;Option A&quot;</kbd>
              <kbd className="px-2 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">&quot;Option B&quot;</kbd>
              <span className="mx-1">·</span>
              <span className="mr-1">Navigate:</span>
              <kbd className="px-2 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">&quot;Next&quot;</kbd>
              <kbd className="px-2 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">&quot;Previous&quot;</kbd>
              <kbd className="px-2 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">&quot;Question 5&quot;</kbd>
              <span className="mx-1">·</span>
              <span className="mr-1">Audio:</span>
              <kbd className="px-2 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">&quot;Read Question&quot;</kbd>
              <kbd className="px-2 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">&quot;Repeat&quot;</kbd>
              <span className="mx-1">·</span>
              <span className="mr-1">Time & Submit:</span>
              <kbd className="px-2 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">&quot;How much time is left?&quot;</kbd>
              <kbd className="px-2 py-0.5 rounded bg-muted/80 border border-border font-mono text-2xs text-foreground">&quot;Submit Exam&quot;</kbd>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
