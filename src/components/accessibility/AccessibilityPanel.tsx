"use client"

import React, { useEffect, useState } from 'react'
import { Settings2 } from "lucide-react"
import { useAccessibilityStore, TextSize, Contrast, VoiceSpeed, Language } from "@/store/useAccessibilityStore"
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

export function AccessibilityPanel() {
  const [mounted, setMounted] = useState(false)
  
  const { 
    textSize, setTextSize,
    contrast, setContrast,
    reducedMotion, setReducedMotion,
    audioAssistance, setAudioAssistance,
    voiceSpeed, setVoiceSpeed,
    language, setLanguage
  } = useAccessibilityStore()
  
  const { theme, setTheme } = useTheme()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

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
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Accessibility Settings</DialogTitle>
          <DialogDescription>
            Customize your experience. These settings will be saved automatically.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          
          {/* Text Size */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Text Size</Label>
            <RadioGroup 
              value={textSize} 
              onValueChange={(val) => setTextSize(val as TextSize)}
              className="flex flex-col space-y-1"
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
            <Label className="text-base font-semibold">Contrast</Label>
            <RadioGroup 
              value={contrast} 
              onValueChange={(val) => setContrast(val as Contrast)}
              className="flex flex-col space-y-1"
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
            <Label className="text-base font-semibold">Theme</Label>
            <RadioGroup 
              value={theme || 'system'} 
              onValueChange={(val) => setTheme(val)}
              className="flex flex-col space-y-1"
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
              <Label className="text-base font-semibold">Reduced Motion</Label>
              <p className="text-sm text-muted-foreground">
                Minimize animations
              </p>
            </div>
            <Switch 
              checked={reducedMotion}
              onCheckedChange={setReducedMotion}
              aria-label="Toggle reduced motion"
            />
          </div>

          {/* Audio Assistance */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Audio Assistance</Label>
              <p className="text-sm text-muted-foreground">
                Enable voice navigation
              </p>
            </div>
            <Switch 
              checked={audioAssistance}
              onCheckedChange={setAudioAssistance}
              aria-label="Toggle audio assistance"
            />
          </div>

          {/* Voice Speed */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Voice Speed</Label>
            <RadioGroup 
              value={voiceSpeed} 
              onValueChange={(val) => setVoiceSpeed(val as VoiceSpeed)}
              className="flex flex-col space-y-1"
              disabled={!audioAssistance}
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
