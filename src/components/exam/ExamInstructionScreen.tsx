"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Clock, 
  FileText, 
  Award, 
  ShieldAlert, 
  Mic, 
  Volume2, 
  RotateCcw, 
  ArrowLeft, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { forceSpeak, unlockAudioContext, voiceEngine } from '@/lib/accessibility/voice-companion';
import { stopSpeaking, subscribe } from '@/lib/voice/useVoiceEngine';
import { registerVoiceContext, unregisterVoiceContext } from '@/lib/voice/commandRouter';
import { playVoiceFeedbackChime } from '@/lib/voice/intent-parser';
import { ExamSectionConfig } from '@/types/section';

export interface ExamInstructionScreenProps {
  examTitle: string;
  authority?: string;
  durationMinutes: number;
  questionsCount: number;
  totalMarks?: number;
  negativeMarking?: string;
  subject?: string;
  sections?: ExamSectionConfig[] | null;
  onStartExam: () => void;
  onGoBack: () => void;
}

export function ExamInstructionScreen({
  examTitle,
  authority,
  durationMinutes,
  questionsCount,
  totalMarks = questionsCount * 2,
  negativeMarking,
  subject,
  sections,
  onStartExam,
  onGoBack,
}: ExamInstructionScreenProps) {
  const language = useAccessibilityStore((s) => s.language);
  const isHindi = language === 'hi';
  const accessibilityMode = useAccessibilityStore((s) => s.accessibilityMode);
  const isKeyboardMode = accessibilityMode === 'keyboard';

  const [isSpeakingInstructions, setIsSpeakingInstructions] = useState(false);
  const [speechCount, setSpeechCount] = useState(0);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const isTransitioningRef = useRef(false);
  const hasSpokenInitialRef = useRef(false);
  const lastReminderTimeRef = useRef(0);


  // Negative marking display fallback
  const resolvedMarking = negativeMarking || (
    examTitle.toLowerCase().includes('ugc') || examTitle.toLowerCase().includes('net')
      ? (isHindi ? "कोई नकारात्मक अंकन नहीं (+2 प्रत्येक सही उत्तर)" : "No negative marking (+2 for each correct answer)")
      : (isHindi ? "+2 सही उत्तर, -0.50 गलत उत्तर" : "+2 for correct, -0.50 penalty for incorrect")
  );

  // Generate the spoken script
  const getSpeechScript = useCallback(() => {
    if (isHindi) {
      return `${examTitle} निर्देश पृष्ठ में आपका स्वागत है। ` +
        `इस परीक्षा की कुल अवधि ${durationMinutes} मिनट है, जिसमें कुल ${questionsCount} प्रश्न और ${totalMarks} अंक हैं। ` +
        `अंकन योजना: ${resolvedMarking}। ` +
        `मुख्य निर्देश: परीक्षा के दौरान आप 'अगला प्रश्न', 'पिछला प्रश्न', 'विकल्प चुनें', या 'सबमिट' बोलकर परीक्षा दे सकते हैं। ` +
        `परीक्षा शुरू होते ही सुरक्षा लॉकडाउन सक्रिय हो जाएगा। ` +
        `क्या आप निर्देश दोबारा सुनना चाहते हैं, वापस जाना चाहते हैं, या परीक्षा शुरू करना चाहते हैं? ` +
        `कृपया बोलें 'परीक्षा शुरू करें', 'दोबारा', या 'वापस'।`;
    }

    return `Welcome to the instructions for ${examTitle}. ` +
      `This examination consists of ${questionsCount} questions with a total duration of ${durationMinutes} minutes, carrying ${totalMarks} marks. ` +
      `Marking scheme: ${resolvedMarking}. ` +
      `Important instructions: You can navigate hands-free by speaking commands like next question, previous, select option, or submit. ` +
      `Anti-cheat security lockdown will activate as soon as the examination begins. ` +
      `Would you like to repeat the instructions, go back, or start the exam? ` +
      `Please say: 'start exam', 'repeat', or 'go back'.`;
  }, [examTitle, durationMinutes, questionsCount, totalMarks, resolvedMarking, isHindi]);

  // Handler to speak instructions aloud (Voice mode only)
  const speakInstructionsAloud = useCallback(() => {
    if (isTransitioningRef.current) return;
    if (useAccessibilityStore.getState().accessibilityMode === 'keyboard') return;

    unlockAudioContext();
    setIsSpeakingInstructions(true);
    const script = getSpeechScript();

    forceSpeak(
      script,
      () => {
        setIsSpeakingInstructions(false);
        unlockAudioContext();
        try {
          voiceEngine.startAlwaysOnListening();
        } catch (_) {}
      },
      isHindi ? 'hi-IN' : 'en-US'
    );
  }, [getSpeechScript, isHindi]);

  // Action: Start Exam (starts that particular exam directly)
  const handleStartExam = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    // Cleanly unregister instruction context & flag immediately
    unregisterVoiceContext('instruction');
    if (typeof window !== 'undefined') {
      (window as any).__examsarthi_instruction_active = false;
    }

    stopSpeaking();
    try {
      playVoiceFeedbackChime();
    } catch (_) {}

    // Immediately launch active exam session so question 1 narration can begin cleanly
    onStartExam();
  }, [onStartExam]);

  // Action: Go Back
  const handleGoBack = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    unregisterVoiceContext('instruction');
    if (typeof window !== 'undefined') {
      (window as any).__examsarthi_instruction_active = false;
    }

    stopSpeaking();
    try {
      playVoiceFeedbackChime();
    } catch (_) {}

    onGoBack();
  }, [onGoBack]);

  // Action: Repeat Instructions
  const handleRepeatInstructions = useCallback(() => {
    if (isTransitioningRef.current) return;
    stopSpeaking();
    setSpeechCount((prev) => prev + 1);
    setActionStatus(isHindi ? "निर्देश दोबारा पढ़े जा रहे हैं..." : "Repeating instructions...");
    setTimeout(() => {
      speakInstructionsAloud();
      setActionStatus(null);
    }, 150);
  }, [isHindi, speakInstructionsAloud]);

  // Keyboard shortcut listener (Enter = Start Exam, Escape = Go Back, R = Repeat)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTransitioningRef.current) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        handleStartExam();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleGoBack();
      } else if (e.key.toLowerCase() === 'r' || e.key.toLowerCase() === 'i') {
        e.preventDefault();
        handleRepeatInstructions();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStartExam, handleGoBack, handleRepeatInstructions]);

  // Mount effect: Trigger initial speech brief & voice listener (Voice mode only)
  useEffect(() => {
    if (isKeyboardMode) {
      hasSpokenInitialRef.current = true;
      return;
    }

    const timer = setTimeout(() => {
      if (!hasSpokenInitialRef.current) {
        hasSpokenInitialRef.current = true;
        speakInstructionsAloud();
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      stopSpeaking();
    };
  }, [speakInstructionsAloud, isKeyboardMode]);

  // Continuous Voice Command Listener (Voice mode only)
  // Strictly isolates instruction commands to ONLY:
  // 1. Start Exam (starts this particular exam)
  // 2. Repeat Instructions
  // 3. Go Back
  const handleInstructionVoiceCommand = useCallback((rawTranscript: string) => {
    if (isTransitioningRef.current || !rawTranscript) return;

    const lower = rawTranscript.toLowerCase().trim();
    console.log('[ExamInstructionScreen] Spoken voice input:', lower);

    // 1. START EXAM TRIGGERS
    const isStart =
      lower.includes('start exam') ||
      lower.includes('start test') ||
      lower.includes('start mock') ||
      lower.includes('start the exam') ||
      lower.includes('start the test') ||
      lower.includes('take exam') ||
      lower.includes('take test') ||
      lower.includes('begin exam') ||
      lower.includes('begin test') ||
      lower.includes('launch exam') ||
      lower.includes('launch test') ||
      lower === 'start' ||
      lower === 'begin' ||
      lower.includes('परीक्षा शुरू करें') ||
      lower.includes('शुरू करें') ||
      lower.includes('परीक्षा शुरू') ||
      lower.includes('स्टार्ट') ||
      lower.includes('एग्जाम शुरू') ||
      lower.includes('टेस्ट शुरू');

    if (isStart) {
      handleStartExam();
      return;
    }

    // 2. REPEAT INSTRUCTIONS TRIGGERS
    const isRepeat =
      lower.includes('repeat instruction') ||
      lower.includes('repeat instructions') ||
      lower.includes('repeat the instruction') ||
      lower.includes('repeat') ||
      lower.includes('again') ||
      lower.includes('read again') ||
      lower.includes('tell again') ||
      lower.includes('speak again') ||
      lower.includes('दोबारा') ||
      lower.includes('फिर से') ||
      lower.includes('दोबारा बोलो') ||
      lower.includes('दोबारा बताओ') ||
      lower.includes('निर्देश दोबारा') ||
      lower.includes('दोहराएं');

    if (isRepeat) {
      handleRepeatInstructions();
      return;
    }

    // 3. GO BACK TRIGGERS
    const isBack =
      lower.includes('go back') ||
      lower.includes('back') ||
      lower.includes('return') ||
      lower.includes('exit') ||
      lower.includes('cancel') ||
      lower.includes('वापस') ||
      lower.includes('पीछे') ||
      lower.includes('वापस जाएं') ||
      lower.includes('बाहर') ||
      lower.includes('रद्द');

    if (isBack) {
      handleGoBack();
      return;
    }

    // 4. ANY OTHER COMMAND ON INSTRUCTION PAGE:
    // Politely prompt candidate that only 'start exam', 'repeat', or 'go back' are valid here
    const now = Date.now();
    if (now - lastReminderTimeRef.current > 3500) {
      lastReminderTimeRef.current = now;
      const prompt = isHindi 
        ? "निर्देश पृष्ठ पर केवल 'परीक्षा शुरू करें', 'दोबारा', या 'वापस' बोलें।"
        : "Please say 'start exam', 'repeat', or 'go back'.";
      forceSpeak(prompt, () => {}, isHindi ? 'hi-IN' : 'en-US');
    }
  }, [handleStartExam, handleRepeatInstructions, handleGoBack, isHindi]);

  useEffect(() => {
    registerVoiceContext('instruction', handleInstructionVoiceCommand);
    if (typeof window !== 'undefined') {
      (window as any).__examsarthi_instruction_active = true;
    }

    if (isKeyboardMode) {
      return () => {
        unregisterVoiceContext('instruction');
        if (typeof window !== 'undefined') {
          (window as any).__examsarthi_instruction_active = false;
        }
      };
    }

    const unsubscribe = subscribe(handleInstructionVoiceCommand);

    return () => {
      unregisterVoiceContext('instruction');
      if (typeof window !== 'undefined') {
        (window as any).__examsarthi_instruction_active = false;
      }
      unsubscribe();
    };
  }, [handleInstructionVoiceCommand, isKeyboardMode]);

  return (
    <div 
      id="exam-instruction-screen"
      className="min-h-screen bg-background text-foreground flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto"
      role="region"
      aria-label="Examination Instructions and Readiness Briefing"
    >
      {/* Top Header / Breadcrumb */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoBack}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Go back to exam catalog"
            >
              <ArrowLeft className="size-4" />
              <span>{isHindi ? 'वापस जाएं' : 'Back to Hub'}</span>
            </Button>
            <span className="text-border">|</span>
            <div className="flex items-center space-x-2">
              <Sparkles className="size-4 text-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {isHindi ? 'परीक्षा निर्देश व विवरण' : 'Exam Instruction & Briefing'}
              </span>
            </div>
          </div>

          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs">
            {isHindi ? 'सुरक्षा स्टैंडबाय' : 'Lockdown Standby'}
          </Badge>
        </div>

        {/* Hero Card */}
        <Card className="border-border/70 shadow-sm bg-card/60 backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="secondary" className="font-medium text-xs">
                {authority || (isHindi ? 'आधिकारिक मॉक परीक्षण' : 'Official Mock Simulation')}
              </Badge>
              {subject && (
                <span className="text-xs text-muted-foreground">
                  {isHindi ? 'विषय: ' : 'Subject: '} <strong className="text-foreground">{subject}</strong>
                </span>
              )}
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-foreground">
              {examTitle}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-muted-foreground">
              {isHindi 
                ? 'कृपया परीक्षा प्रारंभ करने से पूर्व सभी नियमों और समय सीमा को ध्यानपूर्वक समझें।'
                : 'Please review all parameters and operational guidelines carefully before launching your test session.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 4-Column Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-3.5 sm:p-4 rounded-lg border border-border/60 bg-muted/20 flex flex-col items-start space-y-1">
                <div className="flex items-center space-x-2 text-primary">
                  <Clock className="size-4" />
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    {isHindi ? 'कुल समय' : 'Duration'}
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {durationMinutes} <span className="text-sm font-normal text-muted-foreground">{isHindi ? 'मिनट' : 'Mins'}</span>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-lg border border-border/60 bg-muted/20 flex flex-col items-start space-y-1">
                <div className="flex items-center space-x-2 text-primary">
                  <FileText className="size-4" />
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    {isHindi ? 'कुल प्रश्न' : 'Questions'}
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {questionsCount} <span className="text-sm font-normal text-muted-foreground">{isHindi ? 'प्रश्न' : 'Total'}</span>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-lg border border-border/60 bg-muted/20 flex flex-col items-start space-y-1">
                <div className="flex items-center space-x-2 text-primary">
                  <Award className="size-4" />
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    {isHindi ? 'कुल अंक' : 'Max Marks'}
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {totalMarks} <span className="text-sm font-normal text-muted-foreground">{isHindi ? 'अंक' : 'Marks'}</span>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-lg border border-border/60 bg-muted/20 flex flex-col items-start space-y-1">
                <div className="flex items-center space-x-2 text-amber-500">
                  <AlertCircle className="size-4" />
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    {isHindi ? 'अंकन प्रणाली' : 'Marking'}
                  </span>
                </div>
                <div className="text-sm sm:text-base font-semibold text-foreground line-clamp-2">
                  {resolvedMarking}
                </div>
              </div>
            </div>

            {/* Optional Section Breakdown */}
            {sections && sections.length > 0 && (
              <div className="rounded-lg border border-border/60 p-4 bg-muted/10 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="size-3.5" />
                  <span>{isHindi ? 'सेक्शनल समय विवरण' : 'Sectional Timing & Composition'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {sections.map((sec, idx) => (
                    <div key={sec.id || idx} className="p-2.5 rounded border border-border/40 bg-background/50 flex justify-between items-center text-xs">
                      <span className="font-medium text-foreground">{idx + 1}. {sec.name}</span>
                      <span className="font-mono text-muted-foreground">{sec.duration_minutes}m</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Candidate Rules Card */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <HelpCircle className="size-4 text-primary" />
                <span>{isHindi ? 'अनिवार्य परीक्षा निर्देश' : 'Required Candidate Instructions'}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg border border-border/50 bg-background/60 flex items-start space-x-3">
                  <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {isHindi ? 'स्मार्ट वॉइस स्क्राइब सक्रिय' : 'Voice-Assisted Navigation'}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {isHindi 
                        ? "आप कभी भी 'अगला', 'पिछला', 'विकल्प 1', 'फ्लैग' या 'सबमिट' बोलकर परीक्षा दे सकते हैं।"
                        : "Speak anytime: 'Option A', 'Next question', 'Previous', 'Flag question', or 'Submit exam'."}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border/50 bg-background/60 flex items-start space-x-3">
                  <div className="size-7 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {isHindi ? 'सुरक्षा लॉकडाउन नियम' : 'Exam Lockdown & Integrity'}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {isHindi 
                        ? 'परीक्षा शुरू होने के बाद टैब बदलना या विंडो बंद करना मना है। ऐसा करने पर चेतावनी जारी होगी।'
                        : 'Switching tabs or navigating away is locked once started. Full screen anti-cheat monitoring applies.'}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border/50 bg-background/60 flex items-start space-x-3">
                  <div className="size-7 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {isHindi ? 'निरंतर टाइमर व ऑटो सबमिट' : 'Continuous Timer & Auto-Submit'}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {isHindi 
                        ? 'समय समाप्त होने पर उत्तर स्वतः सबमिट हो जाएंगे। आप अंतिम क्षण से पहले समीक्षा कर सकते हैं।'
                        : 'The timer counts down in real time. The exam automatically submits when time expires.'}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border/50 bg-background/60 flex items-start space-x-3">
                  <div className="size-7 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {isHindi ? 'कीबोर्ड और सुगमता शॉर्टकट' : 'Accessibility & Keyboard Shortcuts'}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {isHindi 
                        ? 'एंटर कुंजी से प्रारंभ करें, R से निर्देश दोहराएं, Esc से वापस जाएं।'
                        : 'Press Enter to start, R to repeat instructions, and Esc to go back.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Voice Assistant Interaction Callout & Action Bar */}
      <div className="mt-6 space-y-4 pt-4 border-t border-border/60">
        {/* Dynamic Voice Prompt Pill */}
        <div 
          className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner"
          aria-live="polite"
        >
          <div className="flex items-center space-x-3">
            <div className={`size-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
              isSpeakingInstructions 
                ? 'bg-primary text-primary-foreground animate-pulse shadow-md shadow-primary/20' 
                : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            }`}>
              {isSpeakingInstructions ? <Volume2 className="size-5" /> : <Mic className="size-5 animate-bounce" />}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {isSpeakingInstructions 
                  ? (isHindi ? 'सारथी वॉइस एजेंट बोल रहा है...' : 'Sarthi Voice Agent Briefing...') 
                  : (isHindi ? 'कमांड सुन रहे हैं...' : 'Listening for your response...')}
              </p>
              <p className="text-sm font-medium text-foreground">
                {actionStatus || (isHindi 
                  ? "बोलें: 'परीक्षा शुरू करें', 'दोबारा', या 'वापस'"
                  : "Say: 'Start exam', 'Repeat', or 'Go back'")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-normal">
              {isHindi ? 'वॉइस स्क्राइब सक्रिय' : 'Mic Active'}
            </Badge>
          </div>
        </div>

        {/* 3 Explicit Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Go Back */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleGoBack}
            className="w-full h-13 text-sm font-semibold flex items-center justify-center gap-2 border-border hover:bg-muted/50"
            aria-label="Go back to exam portal"
          >
            <ArrowLeft className="size-4" />
            <span>{isHindi ? 'वापस जाएं' : 'Go Back'}</span>
            <kbd className="hidden sm:inline-block ml-auto text-[10px] uppercase font-mono px-1.5 py-0.5 bg-muted rounded border border-border/50 text-muted-foreground">
              Esc
            </kbd>
          </Button>

          {/* 2. Repeat Instructions */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleRepeatInstructions}
            className="w-full h-13 text-sm font-semibold flex items-center justify-center gap-2 border-border hover:bg-muted/50"
            aria-label="Repeat instructions aloud"
          >
            <RotateCcw className={`size-4 ${isSpeakingInstructions ? 'animate-spin' : ''}`} />
            <span>{isHindi ? 'निर्देश दोबारा सुनें' : 'Repeat Instructions'}</span>
            <kbd className="hidden sm:inline-block ml-auto text-[10px] uppercase font-mono px-1.5 py-0.5 bg-muted rounded border border-border/50 text-muted-foreground">
              R
            </kbd>
          </Button>

          {/* 3. Start Exam (Primary) */}
          <Button
            type="button"
            size="lg"
            onClick={handleStartExam}
            className="w-full h-13 text-sm sm:text-base font-bold flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-transform"
            aria-label="Start examination now"
          >
            <Play className="size-4 fill-white" />
            <span>{isHindi ? 'परीक्षा शुरू करें' : 'Start Exam'}</span>
            <kbd className="hidden sm:inline-block ml-auto text-[10px] uppercase font-mono px-1.5 py-0.5 bg-emerald-700 text-emerald-100 rounded border border-emerald-500/50">
              Enter ↵
            </kbd>
          </Button>
        </div>
      </div>
    </div>
  );
}
