/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings2, Sliders, Eye, SunMoon, Volume2, Move, Globe } from 'lucide-react';
import { useAccessibilityStore, TextSize, Contrast, VoiceSpeed, Language } from "@/store/useAccessibilityStore";
import { useTheme } from "next-themes";
import { useTranslation } from "@/lib/i18n";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  
  const { 
    textSize, setTextSize,
    contrast, setContrast,
    reducedMotion, setReducedMotion,
    audioAssistance, setAudioAssistance,
    voiceSpeed, setVoiceSpeed,
    language, setLanguage,
    screenReaderMode, setScreenReaderMode
  } = useAccessibilityStore();
  
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4" role="status" aria-live="polite">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em]" />
          <p className="text-muted-foreground text-sm font-medium">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-8">
      
      {/* Navigation Breadcrumb */}
      <nav aria-label="Settings navigation" className="flex items-center justify-between">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{t('backToDashboard')}</span>
        </Link>
        <Badge variant="outline" className="gap-1 font-semibold text-xs py-1">
          <Sliders className="h-3 w-3" aria-hidden="true" />
          <span>Saved Locally</span>
        </Badge>
      </nav>

      {/* Header */}
      <header className="space-y-2 border-b border-border/80 pb-6">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          <span>{t('accessibilitySettings')}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
          {t('settingsTitle')}
        </h1>
        <p className="text-base text-muted-foreground">
          {t('settingsSubtitle')}
        </p>
      </header>

      <div className="grid gap-6">

        {/* 1. Typography & Text Scaling */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" aria-hidden="true" />
              <CardTitle className="text-lg font-bold">{t('textSizeHeading')}</CardTitle>
            </div>
            <CardDescription>
              {t('textSizeDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={textSize} 
              onValueChange={(val) => setTextSize(val as TextSize)}
              className="grid sm:grid-cols-3 gap-3"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="default" id="settings-ts-default" />
                <Label htmlFor="settings-ts-default" className="cursor-pointer font-medium">
                  {t('defaultSize')}
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="large" id="settings-ts-large" />
                <Label htmlFor="settings-ts-large" className="cursor-pointer font-medium">
                  {t('largeSize')}
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="xlarge" id="settings-ts-xlarge" />
                <Label htmlFor="settings-ts-xlarge" className="cursor-pointer font-medium">
                  {t('extraLargeSize')}
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* 2. Visual Theme & Contrast */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <SunMoon className="h-4 w-4 text-primary" aria-hidden="true" />
              <CardTitle className="text-lg font-bold">{t('themeContrastHeading')}</CardTitle>
            </div>
            <CardDescription>
              {t('themeContrastDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Theme Mode</Label>
              <RadioGroup 
                value={theme || 'system'} 
                onValueChange={(val) => setTheme(val)}
                className="grid sm:grid-cols-3 gap-3"
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="light" id="settings-theme-light" />
                  <Label htmlFor="settings-theme-light" className="cursor-pointer font-medium">{t('lightMode')}</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="dark" id="settings-theme-dark" />
                  <Label htmlFor="settings-theme-dark" className="cursor-pointer font-medium">{t('darkMode')}</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="system" id="settings-theme-system" />
                  <Label htmlFor="settings-theme-system" className="cursor-pointer font-medium">{t('systemMode')}</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3 pt-4 border-t border-border/60">
              <Label className="text-sm font-semibold">Contrast Level</Label>
              <RadioGroup 
                value={contrast} 
                onValueChange={(val) => setContrast(val as Contrast)}
                className="grid sm:grid-cols-2 gap-3"
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="default" id="settings-c-default" />
                  <Label htmlFor="settings-c-default" className="cursor-pointer font-medium">{t('standardContrast')}</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="high" id="settings-c-high" />
                  <Label htmlFor="settings-c-high" className="cursor-pointer font-medium">{t('highContrast')}</Label>
                </div>
              </RadioGroup>
            </div>

          </CardContent>
        </Card>

        {/* 3. Motion & Animation */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Move className="h-4 w-4 text-primary" aria-hidden="true" />
              <CardTitle className="text-lg font-bold">{t('motionHeading')}</CardTitle>
            </div>
            <CardDescription>
              {t('motionDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60">
              <div className="space-y-0.5 pr-4">
                <Label htmlFor="settings-reduced-motion" className="text-base font-semibold cursor-pointer">
                  {t('reducedMotionLabel')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('reducedMotionDesc')}
                </p>
              </div>
              <Switch 
                id="settings-reduced-motion"
                checked={reducedMotion}
                onCheckedChange={setReducedMotion}
                aria-label="Toggle reduced motion"
              />
            </div>
          </CardContent>
        </Card>

        {/* 4. Voice & Audio Assistance */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-primary" aria-hidden="true" />
              <CardTitle className="text-lg font-bold">{t('audioVoiceHeading')}</CardTitle>
            </div>
            <CardDescription>
              {t('audioVoiceDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60">
              <div className="space-y-0.5 pr-4">
                <Label htmlFor="settings-audio-assistance" className="text-base font-semibold cursor-pointer">
                  {t('audioAssistanceLabel')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('audioAssistanceDesc')}
                </p>
              </div>
              <Switch 
                id="settings-audio-assistance"
                checked={audioAssistance}
                onCheckedChange={setAudioAssistance}
                aria-label="Toggle audio assistance"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60">
              <div className="space-y-0.5 pr-4">
                <Label htmlFor="settings-screen-reader" className="text-base font-semibold cursor-pointer">
                  {t('screenReaderHarmonyLabel')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('screenReaderHarmonyDesc')}
                </p>
              </div>
              <Switch 
                id="settings-screen-reader"
                checked={screenReaderMode}
                onCheckedChange={setScreenReaderMode}
                aria-label="Toggle screen reader harmony mode"
              />
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-sm font-semibold">{t('voiceSpeedLabel')}</Label>
              <RadioGroup 
                value={voiceSpeed} 
                onValueChange={(val) => setVoiceSpeed(val as VoiceSpeed)}
                className="grid sm:grid-cols-3 gap-3"
                disabled={!audioAssistance}
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="slow" id="settings-vs-slow" />
                  <Label htmlFor="settings-vs-slow" className="cursor-pointer font-medium">Slow (0.8x)</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="normal" id="settings-vs-normal" />
                  <Label htmlFor="settings-vs-normal" className="cursor-pointer font-medium">Normal (1.0x)</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="fast" id="settings-vs-fast" />
                  <Label htmlFor="settings-vs-fast" className="cursor-pointer font-medium">Fast (1.2x)</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* 5. Language Preferences */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" aria-hidden="true" />
              <CardTitle className="text-lg font-bold">{t('languageHeading')}</CardTitle>
            </div>
            <CardDescription>
              {t('languageDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs space-y-2">
              <Label htmlFor="settings-language-select">{t('language')}</Label>
              <Select 
                value={language} 
                onValueChange={(val) => setLanguage(val as Language)}
              >
                <SelectTrigger id="settings-language-select" aria-label="Interface Language Selection">
                  <SelectValue placeholder={t('selectLanguage')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (Default)</SelectItem>
                  <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Footer navigation */}
      <footer className="pt-6 border-t border-border flex items-center justify-between">
        <Button variant="outline" render={<Link href="/dashboard" />}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          <span>{t('returnToDashboard')}</span>
        </Button>
        <Button render={<Link href="/exam" />}>
          <span>{t('startMockExam')}</span>
        </Button>
      </footer>

    </div>
  );
}
