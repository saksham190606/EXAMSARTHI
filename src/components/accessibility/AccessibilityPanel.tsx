"use client"

import React, { useEffect, useState } from 'react'
import { Settings2, Play, Square, Sparkles } from "lucide-react"
import { useAccessibilityStore, TextSize, Contrast, VoiceSpeed } from "@/store/useAccessibilityStore"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getAvailableVoices,
  categorizeVoice,
  speakHighFidelity,
  stopHighFidelitySpeech,
  onVoicesLoaded,
  CategorizedVoice,
} from "@/lib/voice/speech-synthesis"

const emptySubscribe = () => () => { }

export function AccessibilityPanel() {
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  const {
    textSize, setTextSize,
    contrast, setContrast,
    reducedMotion, setReducedMotion,
    audioAssistance, setAudioAssistance,
    autoReadQuestions, setAutoReadQuestions,
    enableVoiceCommands, setEnableVoiceCommands,
    voiceModeEnabled, setVoiceModeEnabled,
    voiceSpeed, setVoiceSpeed,
    speechRate, setSpeechRate,
    selectedVoiceURI, setSelectedVoiceURI,
    language
  } = useAccessibilityStore()

  const { theme, setTheme } = useTheme()

  const [availableVoices, setAvailableVoices] = useState<CategorizedVoice[]>([])
  const [isPlayingTest, setIsPlayingTest] = useState(false)

  useEffect(() => {
    const refreshVoices = () => {
      const raw = getAvailableVoices(language)
      const categorized = raw.map(categorizeVoice)
      setAvailableVoices(categorized)
    }

    refreshVoices()
    const unsubscribe = onVoicesLoaded(refreshVoices)
    return () => {
      unsubscribe()
      stopHighFidelitySpeech()
    }
  }, [language])

  const handleTestVoice = () => {
    if (isPlayingTest) {
      stopHighFidelitySpeech()
      setIsPlayingTest(false)
      return
    }

    setIsPlayingTest(true)
    const testText = language === 'hi'
      ? 'नमस्कार! यह परीक्षा सारथी की उच्च गुणवत्ता आवाज़ का नमूना है।'
      : 'Hello! This is a preview of the Exam Saarthi high-fidelity neural voice.'

    speakHighFidelity(testText, {
      lang: language === 'hi' ? 'hi-IN' : 'en-US',
      voiceURI: selectedVoiceURI,
      rate: speechRate,
      onStart: () => setIsPlayingTest(true),
      onEnd: () => setIsPlayingTest(false),
      onError: () => setIsPlayingTest(false),
    })
  }

  const triggerClasses = "size-9 inline-flex items-center justify-center rounded-[2px] border border-white/20 bg-black text-white shadow-none hover:bg-white/10 hover:border-white/40 transition-all duration-120 ease-out motion-safe:active:scale-95 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffed00] focus-visible:ring-offset-2 focus-visible:ring-offset-black cursor-pointer"

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Accessibility Settings"
        className={triggerClasses}
      >
        <Settings2 className="size-4" aria-hidden="true" />
      </button>
    )
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Accessibility Settings"
            className={triggerClasses}
          />
        }
      >
        <Settings2 className="size-4" aria-hidden="true" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Accessibility Settings</DialogTitle>
          <DialogDescription>
            Customize your experience. These settings will be saved automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4 overflow-y-auto min-h-0 pr-1">

          {/* Text Size */}
          <div className="space-y-3">
            <div id="ts-legend" className="text-base font-semibold">Text Size</div>
            <RadioGroup
              value={textSize}
              onValueChange={(val) => setTextSize(val as TextSize)}
              className="flex flex-col space-y-1"
              aria-labelledby="ts-legend"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="default" id="ts-default" />
                <Label htmlFor="ts-default">Default</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="large" id="ts-large" />
                <Label htmlFor="ts-large">Large</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="xlarge" id="ts-xlarge" />
                <Label htmlFor="ts-xlarge">Extra Large</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Contrast */}
          <div className="space-y-3">
            <div id="c-legend" className="text-base font-semibold">Contrast</div>
            <RadioGroup
              value={contrast}
              onValueChange={(val) => setContrast(val as Contrast)}
              className="flex flex-col space-y-1"
              aria-labelledby="c-legend"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="default" id="c-default" />
                <Label htmlFor="c-default">Default</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="c-high" />
                <Label htmlFor="c-high">High Contrast</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Theme */}
          <div className="space-y-3">
            <div id="theme-legend" className="text-base font-semibold">Theme</div>
            <RadioGroup
              value={theme || 'system'}
              onValueChange={(val) => setTheme(val)}
              className="flex flex-col space-y-1"
              aria-labelledby="theme-legend"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="theme-light" />
                <Label htmlFor="theme-light">Light</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="theme-dark" />
                <Label htmlFor="theme-dark">Dark</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="theme-system" />
                <Label htmlFor="theme-system">System</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Reduced Motion */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reduced-motion-switch" className="text-base font-semibold">Reduced Motion</Label>
              <p id="reduced-motion-desc" className="text-sm text-muted-foreground">
                Minimize animations
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="text-sm font-medium w-6 text-right">
                {reducedMotion ? 'On' : 'Off'}
              </span>
              <Switch
                id="reduced-motion-switch"
                checked={reducedMotion}
                onCheckedChange={setReducedMotion}
                aria-label="Toggle reduced motion"
                aria-describedby="reduced-motion-desc"
              />
            </div>
          </div>

          {/* Audio Assistance */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="audio-assistance-switch" className="text-base font-semibold">Audio Assistance</Label>
              <p id="audio-assistance-desc" className="text-sm text-muted-foreground">
                Enable voice navigation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="text-sm font-medium w-6 text-right">
                {audioAssistance ? 'On' : 'Off'}
              </span>
              <Switch
                id="audio-assistance-switch"
                checked={audioAssistance}
                onCheckedChange={setAudioAssistance}
                aria-label="Toggle audio assistance"
                aria-describedby="audio-assistance-desc"
              />
            </div>
          </div>

          {/* Voice Companion Talk-Back & Tour */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="voice-mode-switch" className="text-base font-semibold">Voice Companion &amp; Talk-Back</Label>
              <p id="voice-mode-desc" className="text-sm text-muted-foreground">
                Automated audio tour and spoken feedback on Tab navigation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="text-sm font-medium w-6 text-right">
                {voiceModeEnabled ? 'On' : 'Off'}
              </span>
              <Switch
                id="voice-mode-switch"
                checked={voiceModeEnabled}
                onCheckedChange={setVoiceModeEnabled}
                aria-label="Toggle voice companion and tab talk-back"
                aria-describedby="voice-mode-desc"
              />
            </div>
          </div>

          {/* Auto Read Questions */}
          {audioAssistance && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-read-switch" className="text-base font-semibold">Auto Read Questions</Label>
                <p id="auto-read-desc" className="text-sm text-muted-foreground">
                  Automatically read questions out loud when they appear
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-sm font-medium w-6 text-right">
                  {autoReadQuestions ? 'On' : 'Off'}
                </span>
                <Switch
                  id="auto-read-switch"
                  checked={autoReadQuestions}
                  onCheckedChange={setAutoReadQuestions}
                  aria-label="Toggle auto read questions"
                  aria-describedby="auto-read-desc"
                />
              </div>
            </div>
          )}

          {/* Voice Commands */}
          {audioAssistance && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="voice-commands-switch" className="text-base font-semibold">Voice Commands</Label>
                <p id="voice-commands-desc" className="text-sm text-muted-foreground">
                  Control exam with your voice
                </p>
              </div>
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="text-sm font-medium w-6 text-right">
                {enableVoiceCommands ? 'On' : 'Off'}
              </span>
              <Switch
                id="voice-commands-switch"
                checked={enableVoiceCommands}
                onCheckedChange={setEnableVoiceCommands}
                aria-label="Toggle voice commands"
                aria-describedby="voice-commands-desc"
              />
            </div>
            </div>
          )}

          {/* Voice Profile Dropdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="panel-voice-profile" className="text-base font-semibold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                Voice Profile
              </Label>
              <span className="text-xs font-mono font-medium text-muted-foreground">
                {language === 'hi' ? 'Hindi' : 'English'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Browser neural &amp; natural voices filtered by active language.
            </p>
            <Select
              value={selectedVoiceURI || 'auto'}
              onValueChange={(val) => setSelectedVoiceURI(val === 'auto' ? null : val)}
              disabled={!audioAssistance}
            >
              <SelectTrigger id="panel-voice-profile" className="w-full text-xs" aria-label="Voice Profile Selection">
                <SelectValue placeholder="Neural Auto-Select (Recommended)" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                <SelectItem value="auto">
                  <span className="font-medium text-primary">✨ Neural Auto-Select</span>
                </SelectItem>
                {availableVoices.map((cv) => (
                  <SelectItem key={cv.voice.voiceURI} value={cv.voice.voiceURI} className="text-xs">
                    {cv.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Speech Rate & Test Voice */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div id="vs-legend" className="text-base font-semibold">Speech Rate</div>
              <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted border border-border">
                {speechRate.toFixed(2)}x
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="panel-speech-rate"
                type="range"
                min="0.8"
                max="1.2"
                step="0.05"
                value={speechRate}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSpeechRate(val);
                  if (val <= 0.85) setVoiceSpeed('slow');
                  else if (val >= 1.15) setVoiceSpeed('fast');
                  else setVoiceSpeed('normal');
                }}
                disabled={!audioAssistance}
                aria-valuemin={0.8}
                aria-valuemax={1.2}
                aria-valuenow={speechRate}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestVoice}
                disabled={!audioAssistance}
                className="shrink-0 h-8 text-xs font-medium gap-1 px-2.5"
                aria-label="Test Voice"
              >
                {isPlayingTest ? (
                  <>
                    <Square className="h-3 w-3 text-destructive fill-destructive" aria-hidden="true" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 text-primary fill-primary" aria-hidden="true" />
                    <span>Test</span>
                  </>
                )}
              </Button>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={!audioAssistance}
                onClick={() => {
                  setSpeechRate(0.8);
                  setVoiceSpeed('slow');
                }}
                className={`py-1 text-xs font-medium border rounded-[2px] transition-colors ${
                  Math.abs(speechRate - 0.8) < 0.04
                    ? 'bg-primary text-primary-foreground border-primary font-bold'
                    : 'border-border/60 hover:bg-muted/40'
                }`}
              >
                0.8x
              </button>
              <button
                type="button"
                disabled={!audioAssistance}
                onClick={() => {
                  setSpeechRate(1.0);
                  setVoiceSpeed('normal');
                }}
                className={`py-1 text-xs font-medium border rounded-[2px] transition-colors ${
                  Math.abs(speechRate - 1.0) < 0.04
                    ? 'bg-primary text-primary-foreground border-primary font-bold'
                    : 'border-border/60 hover:bg-muted/40'
                }`}
              >
                1.0x
              </button>
              <button
                type="button"
                disabled={!audioAssistance}
                onClick={() => {
                  setSpeechRate(1.2);
                  setVoiceSpeed('fast');
                }}
                className={`py-1 text-xs font-medium border rounded-[2px] transition-colors ${
                  Math.abs(speechRate - 1.2) < 0.04
                    ? 'bg-primary text-primary-foreground border-primary font-bold'
                    : 'border-border/60 hover:bg-muted/40'
                }`}
              >
                1.2x
              </button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
