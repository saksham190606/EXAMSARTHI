"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Eye, Loader2, Volume2, VolumeX, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { speak, stopSpeech } from "@/lib/accessibility/voice-companion";
import { useAccessibilityStore } from "@/store/useAccessibilityStore";

interface DiagramDescriberProps {
  imageUrl: string;
  questionText?: string;
}

export function DiagramDescriber({ imageUrl, questionText }: DiagramDescriberProps) {
  const language = useAccessibilityStore((s) => s.language);
  const isHindi = language === "hi";

  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [source, setSource] = useState<string | null>(null);

  const handleDescribe = useCallback(async () => {
    if (loading) return;

    // If currently speaking this description, stop it
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }

    // If we already have the description cached, simply speak it again
    if (description) {
      setIsSpeaking(true);
      speak(description, {
        langOverride: isHindi ? "hi" : "en",
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
      return;
    }

    setLoading(true);
    speak(
      isHindi ? "विजन एआई से चित्र का विश्लेषण किया जा रहा है..." : "Analyzing diagram with Vision AI...",
      { cancelPrevious: true, langOverride: isHindi ? "hi" : "en" }
    );

    try {
      const res = await fetch("/api/ai/describe-diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, lang: language }),
      });

      const data = await res.json();

      if (data.success && data.description) {
        setDescription(data.description);
        setSource(data.source || null);
        setIsSpeaking(true);
        speak(`${isHindi ? "चित्र का विवरण: " : "Diagram Description: "}${data.description}`, {
          langOverride: isHindi ? "hi" : "en",
          onEnd: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
      } else {
        const errorMsg = isHindi
          ? "इस समय चित्र का विश्लेषण नहीं किया जा सका। कृपया अपने परीक्षा पर्यवेक्षक से सहायता का अनुरोध करें।"
          : "Could not analyze the diagram at this time. Please request assistance from your exam supervisor.";
        setDescription(errorMsg);
        speak(errorMsg, { langOverride: isHindi ? "hi" : "en" });
      }
    } catch (err) {
      console.error("[DiagramDescriber] Fetch error:", err);
      const fallbackMsg = isHindi
        ? "यह चित्र एक परीक्षा चित्रण दर्शाता है। कृपया दृश्य लेबलों को देखें या अपने परीक्षा स्क्राइब से परामर्श करें।"
        : "The diagram shows an examination illustration. Please refer to visual labels or consult your exam scribe.";
      setDescription(fallbackMsg);
      speak(fallbackMsg, { langOverride: isHindi ? "hi" : "en" });
    } finally {
      setLoading(false);
    }
  }, [imageUrl, loading, isSpeaking, description, isHindi, language]);

  const handleStopSpeech = () => {
    stopSpeech();
    setIsSpeaking(false);
  };

  // Keyboard shortcut listener for Alt + D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "d" || e.key === "D" || e.code === "KeyD")) {
        e.preventDefault();
        handleDescribe();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleDescribe]);

  // Listen for voice action 'describe-diagram'
  useEffect(() => {
    const handleVoiceAction = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.action === 'describe-diagram') {
        handleDescribe();
      }
    };
    window.addEventListener('examsarthi-voice-action', handleVoiceAction);
    return () => {
      window.removeEventListener('examsarthi-voice-action', handleVoiceAction);
    };
  }, [handleDescribe]);

  // Reset cached description if question changes (imageUrl changes)
  useEffect(() => {
    setDescription(null);
    setIsSpeaking(false);
    setSource(null);
  }, [imageUrl]);

  return (
    <div
      className="mt-4 p-4 rounded-[2px] border border-border bg-card/60 backdrop-blur-sm space-y-3"
      role="region"
      aria-label={isHindi ? "चित्र विजन एआई सहायक" : "Diagram Vision AI Assistant"}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center size-7 rounded-[2px] bg-[#ffed00] text-black">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              {isHindi ? "मल्टीमॉडल सुलभता सहायक" : "Multimodal Accessibility Assistant"}
            </span>
            <span className="text-sm font-bold text-foreground">
              {isHindi ? "डायग्राम विजन एआई" : "Diagram Vision AI"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Main Describe Button */}
          <Button
            type="button"
            onClick={handleDescribe}
            disabled={loading}
            className="h-10 px-4 text-xs sm:text-sm font-bold bg-[#ffed00] text-black hover:bg-[#e5d500] border-none shadow-[0_2px_8px_rgba(255,237,0,0.25)] rounded-[2px]"
            aria-label={
              isHindi
                ? "विजन एआई से चित्र का विवरण सुनें (कीबोर्ड शॉर्टकट Alt + D)"
                : "Describe diagram with Vision AI (Keyboard shortcut Alt plus D)"
            }
            data-voice-prompt={
              isHindi
                ? "इस परीक्षा चित्र का विवरण विजन एआई से सुनें? सुनने के लिए हाँ कहें, या छोड़ने के लिए ना कहें।"
                : "Describe this exam diagram with Vision AI? Say Yes to listen, or say No to skip."
            }
            data-voice-confirm={
              isHindi ? "विजन एआई से चित्र का विश्लेषण किया जा रहा है..." : "Analyzing diagram with Vision AI..."
            }
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                <span>{isHindi ? "चित्र का विश्लेषण हो रहा है..." : "Analyzing Diagram..."}</span>
              </>
            ) : isSpeaking ? (
              <>
                <Volume2 className="mr-2 size-4 animate-pulse text-black" aria-hidden="true" />
                <span>{isHindi ? "विवरण पढ़ा जा रहा है..." : "Reading Description..."}</span>
              </>
            ) : (
              <>
                <Eye className="mr-2 size-4" aria-hidden="true" />
                <span>{isHindi ? "चित्र का विवरण (Alt+D)" : "Describe Diagram (Alt+D)"}</span>
              </>
            )}
          </Button>

          {/* Stop Audio Button if currently reading */}
          {isSpeaking && (
            <Button
              type="button"
              variant="outline"
              onClick={handleStopSpeech}
              className="h-10 px-3 text-xs font-bold border-red-500/50 text-red-500 hover:bg-red-500/10 rounded-[2px]"
              aria-label={isHindi ? "चित्र का विवरण पढ़ना रोकें" : "Stop reading diagram description"}
            >
              <VolumeX className="mr-1.5 size-4" aria-hidden="true" />
              <span>{isHindi ? "ऑडियो रोकें" : "Stop Audio"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Accessible Transcript Container */}
      {description && (
        <div
          className="p-3.5 bg-background rounded-[2px] border border-border/80 text-sm leading-relaxed text-foreground space-y-2 animate-in fade-in duration-200"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground border-b border-border/40 pb-1.5">
            <span className="flex items-center gap-1.5">
              <Eye className="size-3.5 text-primary" aria-hidden="true" />
              <span>Diagram Description Transcript</span>
            </span>
            {source && (
              <span className="text-[11px] uppercase tracking-wider text-primary font-bold">
                {source === "gemini-vision" ? "Gemini 1.5 Flash Vision" : "Authoritative Scribe"}
              </span>
            )}
          </div>
          <p className="font-mono text-xs sm:text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
            {description}
          </p>
        </div>
      )}
    </div>
  );
}
