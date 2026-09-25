"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";

interface DictationButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function DictationButton({ onTranscript, disabled }: DictationButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          }
        }
        if (finalTranscript) {
          onTranscript(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
           setError("Microphone access denied.");
        }
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, [onTranscript]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setError(null);
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        onClick={toggleRecording}
        disabled={disabled}
        variant={isRecording ? "destructive" : "secondary"}
        size="sm"
        aria-pressed={isRecording}
        aria-label={isRecording ? "Stop Dictation" : "Start Dictation"}
        className="gap-2"
      >
        {isRecording ? <Square className="size-4" /> : <Mic className="size-4" />}
        {isRecording ? "Stop Dictation" : "Dictate Answer"}
      </Button>
      {error && <span className="text-sm text-destructive">{error}</span>}
      {isRecording && <span className="text-sm text-muted-foreground animate-pulse">Listening...</span>}
    </div>
  );
}
