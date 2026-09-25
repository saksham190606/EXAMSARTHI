"use client"

import React from 'react'
import { Settings2 } from "lucide-react"
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
    autoReadOptions, setAutoReadOptions,
    enableVoiceCommands, setEnableVoiceCommands,
    voiceFeedback, setVoiceFeedback,
    voiceSpeed, setVoiceSpeed
  } = useAccessibilityStore()

  const { theme, setTheme } = useTheme()

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" aria-label="Accessibility Settings">
        <Settings2 className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    )
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="icon" aria-label="Accessibility Settings" />}>
        <Settings2 className="h-[1.2rem] w-[1.2rem]" />
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

          {/* Auto Read Options */}
          {audioAssistance && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-read-options-switch" className="text-base font-semibold">Auto Read Options</Label>
                <p id="auto-read-options-desc" className="text-sm text-muted-foreground">
                  Automatically read answer options after the question
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-sm font-medium w-6 text-right">
                  {autoReadOptions ? 'On' : 'Off'}
                </span>
                <Switch
                  id="auto-read-options-switch"
                  checked={autoReadOptions}
                  onCheckedChange={setAutoReadOptions}
                  aria-label="Toggle auto read options"
                  aria-describedby="auto-read-options-desc"
                />
              </div>
            </div>
          )}

          {/* Voice Feedback */}
          {audioAssistance && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="voice-feedback-switch" className="text-base font-semibold">Voice Feedback</Label>
                <p id="voice-feedback-desc" className="text-sm text-muted-foreground">
                  Provide spoken feedback for navigation and actions
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-sm font-medium w-6 text-right">
                  {voiceFeedback ? 'On' : 'Off'}
                </span>
                <Switch
                  id="voice-feedback-switch"
                  checked={voiceFeedback}
                  onCheckedChange={setVoiceFeedback}
                  aria-label="Toggle voice feedback"
                  aria-describedby="voice-feedback-desc"
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

          {/* Voice Speed */}
          <div className="space-y-3">
            <div id="vs-legend" className="text-base font-semibold">Voice Speed</div>
            <RadioGroup
              value={voiceSpeed}
              onValueChange={(val) => setVoiceSpeed(val as VoiceSpeed)}
              className="flex flex-col space-y-1"
              disabled={!audioAssistance}
              aria-labelledby="vs-legend"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="slow" id="vs-slow" />
                <Label htmlFor="vs-slow">Slow</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="normal" id="vs-normal" />
                <Label htmlFor="vs-normal">Normal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fast" id="vs-fast" />
                <Label htmlFor="vs-fast">Fast</Label>
              </div>
            </RadioGroup>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
