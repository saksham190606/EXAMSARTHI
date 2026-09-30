"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings2, Sliders, Eye, SunMoon, Volume2, Move, Globe, User, CheckCircle2, AlertCircle, Play, Square, Sparkles, Palette } from 'lucide-react';
import { useAccessibilityStore, TextSize, Contrast, ColorTheme, VoiceSpeed, Language } from "@/store/useAccessibilityStore";
import { speak } from "@/lib/accessibility/voice-companion";
import { useTheme } from "next-themes";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import {
  getAvailableVoices,
  categorizeVoice,
  speakHighFidelity,
  stopHighFidelitySpeech,
  onVoicesLoaded,
  CategorizedVoice,
} from "@/lib/voice/speech-synthesis";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoaderOne } from "@/components/ui/loader-one";

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  
  const { 
    textSize, setTextSize,
    contrast, setContrast,
    colorTheme, setColorTheme,
    reducedMotion, setReducedMotion,
    audioAssistance, setAudioAssistance,
    voiceSpeed, setVoiceSpeed,
    speechRate, setSpeechRate,
    selectedVoiceURI, setSelectedVoiceURI,
    language, setLanguage
  } = useAccessibilityStore();
  
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const { user, profile, updateProfile } = useAuth();

  const [fullNameInput, setFullNameInput] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [availableVoices, setAvailableVoices] = useState<CategorizedVoice[]>([]);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  useEffect(() => {
    const refreshVoices = () => {
      const raw = getAvailableVoices(language);
      const categorized = raw.map(categorizeVoice);
      setAvailableVoices(categorized);
    };

    refreshVoices();
    const unsubscribe = onVoicesLoaded(refreshVoices);
    return () => {
      unsubscribe();
      stopHighFidelitySpeech();
    };
  }, [language]);

  const handleTestVoice = () => {
    if (isPlayingTest) {
      stopHighFidelitySpeech();
      setIsPlayingTest(false);
      return;
    }

    setIsPlayingTest(true);
    const testText = language === 'hi'
      ? 'नमस्कार! यह परीक्षा सारथी की उच्च गुणवत्ता आवाज़ का नमूना है। प्रश्न 1, विकल्प ए।'
      : 'Hello! This is a preview of the Exam Saarthi high-fidelity neural voice. Question 1, Option A.';

    speakHighFidelity(testText, {
      lang: language === 'hi' ? 'hi-IN' : 'en-US',
      voiceURI: selectedVoiceURI,
      rate: speechRate,
      onStart: () => setIsPlayingTest(true),
      onEnd: () => setIsPlayingTest(false),
      onError: () => setIsPlayingTest(false),
    });
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (profile?.full_name) {
      setFullNameInput(profile.full_name);
    } else if (user?.user_metadata?.full_name) {
      setFullNameInput(user.user_metadata.full_name);
    }
  }, [profile, user]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);
    setProfileSaving(true);

    try {
      const { data, error } = await updateProfile({ full_name: fullNameInput });
      if (error) {
        setProfileError(error.message || 'Failed to update profile.');
      } else {
        setProfileSuccess('Profile updated successfully.');
        if (data?.full_name) {
          setFullNameInput(data.full_name);
        }
      }
    } catch (err: any) {
      setProfileError(err?.message || 'An unexpected error occurred while saving profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <LoaderOne label="Loading preferences..." size="lg" />
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
      </nav>

      {/* Header */}
      <header className="space-y-2 border-b border-border/80 pb-6">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          <span>{t('accessibilitySettings')}</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          {t('settingsTitle')}
        </h1>
        <p className="text-base text-muted-foreground">
          {t('settingsSubtitle')}
        </p>
      </header>

      <div className="grid gap-6">

        {/* Candidate Profile Section */}
        <Card className="border border-border/80 shadow-none rounded-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" aria-hidden="true" />
                <CardTitle className="font-heading text-xl font-bold text-foreground">Candidate Profile</CardTitle>
              </div>
            </div>
            <CardDescription>
              Manage your candidate identity details synchronized with your EXAMSARTHI account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSave} className="space-y-4">
              {profileSuccess && (
                <Alert role="status" aria-live="polite" className="text-sm border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <AlertTitle>Profile Updated</AlertTitle>
                  <AlertDescription>{profileSuccess}</AlertDescription>
                </Alert>
              )}

              {profileError && (
                <Alert variant="destructive" role="alert" aria-live="assertive" className="text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Update Failed</AlertTitle>
                  <AlertDescription>{profileError}</AlertDescription>
                </Alert>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="settings-candidate-name">Full Name</Label>
                  <Input
                    id="settings-candidate-name"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    placeholder="Candidate Name"
                    disabled={profileSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="settings-candidate-email">Registered Email</Label>
                  <Input
                    id="settings-candidate-email"
                    type="email"
                    value={user?.email || ''}
                    readOnly
                    disabled
                    className="bg-muted/50 cursor-not-allowed opacity-80"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
                <Button 
                  type="submit" 
                  disabled={profileSaving}
                  aria-busy={profileSaving}
                  className="font-medium px-5 h-10"
                >
                  {profileSaving ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                      Saving Profile...
                    </span>
                  ) : (
                    'Save Profile'
                  )}
                </Button>
                {profile?.updated_at && (
                  <span className="text-xs text-muted-foreground">
                    Last updated: {new Date(profile.updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 1. Typography & Text Scaling */}
        <Card className="border border-border/80 shadow-none rounded-none">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" aria-hidden="true" />
              <CardTitle className="font-heading text-xl font-bold text-foreground">{t('textSizeHeading')}</CardTitle>
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
              <div className="flex items-center space-x-3 p-3 rounded-[2px] border border-border/60 hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="default" id="settings-ts-default" />
                <Label htmlFor="settings-ts-default" className="cursor-pointer font-medium">
                  {t('defaultSize')}
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-[2px] border border-border/60 hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="large" id="settings-ts-large" />
                <Label htmlFor="settings-ts-large" className="cursor-pointer font-medium">
                  {t('largeSize')}
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-[2px] border border-border/60 hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="xlarge" id="settings-ts-xlarge" />
                <Label htmlFor="settings-ts-xlarge" className="cursor-pointer font-medium">
                  {t('extraLargeSize')}
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* 2. Visual Theme & Contrast */}
        <Card className="border border-border/80 shadow-none rounded-none">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <SunMoon className="h-4 w-4 text-primary" aria-hidden="true" />
              <CardTitle className="font-heading text-xl font-bold text-foreground">{t('themeContrastHeading')}</CardTitle>
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
                <div className="flex items-center space-x-3 p-3 rounded-[2px] border border-border/60 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="light" id="settings-theme-light" />
                  <Label htmlFor="settings-theme-light" className="cursor-pointer font-medium">{t('lightMode')}</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-[2px] border border-border/60 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="dark" id="settings-theme-dark" />
                  <Label htmlFor="settings-theme-dark" className="cursor-pointer font-medium">{t('darkMode')}</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-[2px] border border-border/60 hover:bg-muted/30 transition-colors">
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
                <div className="flex items-center space-x-3 p-3 rounded-[2px] border border-border/60 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="default" id="settings-c-default" />
                  <Label htmlFor="settings-c-default" className="cursor-pointer font-medium">{t('standardContrast')}</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-[2px] border border-border/60 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="high" id="settings-c-high" />
                  <Label htmlFor="settings-c-high" className="cursor-pointer font-medium">{t('highContrast')}</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Color Blindness & Vision Palettes */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" aria-hidden="true" />
                <Label className="text-sm font-semibold">
                  {language === 'hi' ? 'रंग दृष्टि और कंट्रास्ट पैलेट (Color Blindness Palettes)' : 'Color Vision & Accessibility Palettes'}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {language === 'hi' 
                  ? 'रंग दृष्टि दोष (Color Blindness) या आँखों के तनाव के लिए सुलभ रंग योजना चुनें। डिफ़ॉल्ट हमारी वर्तमान मानक थीम है।'
                  : 'Tailored high-distinction color palettes for color vision deficiency (deuteranopia, protanopia, tritanopia), photophobia, and eye strain. Default is our present standard dark theme.'}
              </p>
              <RadioGroup 
                value={colorTheme || 'default'} 
                onValueChange={(val) => {
                  const themeVal = val as ColorTheme;
                  setColorTheme(themeVal);
                  const names: Record<ColorTheme, string> = {
                    default: language === 'hi' ? 'मानक डिफ़ॉल्ट थीम' : 'Default UI Theme',
                    deuteranopia: language === 'hi' ? 'रेड-ग्रीन सुरक्षित कोबाल्ट थीम' : 'Red-Green Safe Cobalt Palette',
                    tritanopia: language === 'hi' ? 'ब्लू-येलो सुरक्षित रोज़ सियान थीम' : 'Blue-Yellow Safe Rose-Cyan Palette',
                    monochrome: language === 'hi' ? 'मोनोक्रोम ब्लैक एंड व्हाइट' : 'Monochrome High-Contrast Grayscale',
                    sepia: language === 'hi' ? 'वार्म सेपिया एंटी-ग्लेयर' : 'Warm Sepia Anti-Glare Palette',
                  };
                  speak(names[themeVal] || 'Theme updated', { cancelPrevious: true });
                }}
                className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1"
              >
                {/* 1. Default */}
                <div className="flex items-start space-x-3 p-3 rounded-[2px] border border-border/60 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="default" id="settings-theme-default" className="mt-1" />
                  <Label htmlFor="settings-theme-default" className="cursor-pointer font-medium space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span className="size-3 rounded-full bg-[#ffed00] border border-black/40" />
                      <span>{language === 'hi' ? 'मानक (डिफ़ॉल्ट)' : 'Default (Standard)'}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {language === 'hi' ? 'हमारी वर्तमान डार्क एम्बर थीम' : 'Present sleek dark UI with amber accents'}
                    </p>
                  </Label>
                </div>

                {/* 2. Deuteranopia / Protanopia */}
                <div className="flex items-start space-x-3 p-3 rounded-[2px] border border-border/60 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="deuteranopia" id="settings-theme-deuteranopia" className="mt-1" />
                  <Label htmlFor="settings-theme-deuteranopia" className="cursor-pointer font-medium space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span className="size-3 rounded-full bg-blue-500 border border-black/40" />
                      <span>{language === 'hi' ? 'रेड-ग्रीन सेफ' : 'Red-Green Safe'}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {language === 'hi' ? 'ड्यूटेरानोपिया/प्रोटानोपिया (कोबाल्ट व एम्बर)' : 'Cobalt Blue & Gold for Deuteranopia/Protanopia'}
                    </p>
                  </Label>
                </div>

                {/* 3. Tritanopia */}
                <div className="flex items-start space-x-3 p-3 rounded-[2px] border border-border/60 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="tritanopia" id="settings-theme-tritanopia" className="mt-1" />
                  <Label htmlFor="settings-theme-tritanopia" className="cursor-pointer font-medium space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span className="size-3 rounded-full bg-rose-500 border border-black/40" />
                      <span>{language === 'hi' ? 'ब्लू-येलो सेफ' : 'Blue-Yellow Safe'}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {language === 'hi' ? 'ट्रिटानोपिया (क्रिमसन रोज़ व सियान)' : 'Crimson Rose & Cyan for Tritanopia'}
                    </p>
                  </Label>
                </div>

                {/* 4. Monochrome */}
                <div className="flex items-start space-x-3 p-3 rounded-[2px] border border-border/60 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="monochrome" id="settings-theme-monochrome" className="mt-1" />
                  <Label htmlFor="settings-theme-monochrome" className="cursor-pointer font-medium space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span className="size-3 rounded-full bg-white border border-black" />
                      <span>{language === 'hi' ? 'मोनोक्रोम' : 'Monochrome'}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {language === 'hi' ? 'शुद्ध ब्लैक एंड व्हाइट ग्रे-स्केल' : 'Pure high-contrast black & white grayscale'}
                    </p>
                  </Label>
                </div>

                {/* 5. Soft Sepia */}
                <div className="flex items-start space-x-3 p-3 rounded-[2px] border border-border/60 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="sepia" id="settings-theme-sepia" className="mt-1" />
                  <Label htmlFor="settings-theme-sepia" className="cursor-pointer font-medium space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span className="size-3 rounded-full bg-amber-700 border border-black/40" />
                      <span>{language === 'hi' ? 'वार्म सेपिया' : 'Warm Sepia'}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {language === 'hi' ? 'एंटी-ग्लेयर आँखों के तनाव से राहत' : 'Anti-glare reduced eye strain & photophobia'}
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

          </CardContent>
        </Card>

        {/* 3. Motion & Animation */}
        <Card className="border border-border/80 shadow-none rounded-none">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Move className="h-4 w-4 text-primary" aria-hidden="true" />
              <CardTitle className="font-heading text-xl font-bold text-foreground">{t('motionHeading')}</CardTitle>
            </div>
            <CardDescription>
              {t('motionDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 rounded-[2px] border border-border/60">
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
        <Card className="border border-border/80 shadow-none rounded-none">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-primary" aria-hidden="true" />
              <CardTitle className="font-heading text-xl font-bold text-foreground">{t('audioVoiceHeading')}</CardTitle>
            </div>
            <CardDescription>
              {t('audioVoiceDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-3 rounded-[2px] border border-border/60">
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

            {/* Voice Profile Dropdown Selector */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="settings-voice-profile" className="text-sm font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Voice Profile (Neural / Natural)
                </Label>
                <Badge variant="outline" className="text-[11px] font-mono">
                  {language === 'hi' ? 'Hindi (hi-IN)' : 'English (en-US)'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Select your preferred browser speech synthesis voice filtered by active language (Natural Female, Natural Male, Studio Standard).
              </p>
              <Select
                value={selectedVoiceURI || 'auto'}
                onValueChange={(val) => setSelectedVoiceURI(val === 'auto' ? null : val)}
                disabled={!audioAssistance}
              >
                <SelectTrigger id="settings-voice-profile" className="w-full" aria-label="Voice Profile Selection">
                  <SelectValue placeholder="Neural Auto-Select (Google / Microsoft Natural Recommended)" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="auto">
                    <span className="font-medium text-primary">✨ Neural Auto-Select (Recommended)</span>
                  </SelectItem>
                  {availableVoices.map((cv) => (
                    <SelectItem key={cv.voice.voiceURI} value={cv.voice.voiceURI}>
                      <div className="flex items-center justify-between gap-3 w-full">
                        <span>{cv.displayName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Speech Rate Slider & Test Voice Preview */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="settings-speech-rate" className="text-sm font-semibold">
                  Speech Rate (0.8x to 1.2x)
                </Label>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted border border-border">
                  {speechRate.toFixed(2)}x
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Fine-tune speaking pacing for exam questions and walkthroughs.
              </p>
              <div className="flex items-center gap-3">
                <input
                  id="settings-speech-rate"
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
                  className="shrink-0 h-9 font-medium gap-1.5 min-w-[110px]"
                  aria-label="Test Voice"
                >
                  {isPlayingTest ? (
                    <>
                      <Square className="h-3.5 w-3.5 text-destructive fill-destructive" aria-hidden="true" />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 text-primary fill-primary" aria-hidden="true" />
                      <span>Test Voice</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  disabled={!audioAssistance}
                  onClick={() => {
                    setSpeechRate(0.8);
                    setVoiceSpeed('slow');
                  }}
                  className={`py-1.5 text-xs font-medium border rounded-[2px] transition-colors ${
                    Math.abs(speechRate - 0.8) < 0.04
                      ? 'bg-primary text-primary-foreground border-primary font-bold'
                      : 'border-border/60 hover:bg-muted/40'
                  }`}
                >
                  Slow (0.8x)
                </button>
                <button
                  type="button"
                  disabled={!audioAssistance}
                  onClick={() => {
                    setSpeechRate(1.0);
                    setVoiceSpeed('normal');
                  }}
                  className={`py-1.5 text-xs font-medium border rounded-[2px] transition-colors ${
                    Math.abs(speechRate - 1.0) < 0.04
                      ? 'bg-primary text-primary-foreground border-primary font-bold'
                      : 'border-border/60 hover:bg-muted/40'
                  }`}
                >
                  Normal (1.0x)
                </button>
                <button
                  type="button"
                  disabled={!audioAssistance}
                  onClick={() => {
                    setSpeechRate(1.2);
                    setVoiceSpeed('fast');
                  }}
                  className={`py-1.5 text-xs font-medium border rounded-[2px] transition-colors ${
                    Math.abs(speechRate - 1.2) < 0.04
                      ? 'bg-primary text-primary-foreground border-primary font-bold'
                      : 'border-border/60 hover:bg-muted/40'
                  }`}
                >
                  Fast (1.2x)
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. Language Preferences */}
        <Card className="border border-border/80 shadow-none rounded-none">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" aria-hidden="true" />
              <CardTitle className="font-heading text-xl font-bold text-foreground">{t('languageHeading')}</CardTitle>
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
        <Button variant="outline" render={<Link href="/dashboard" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          <span>{t('returnToDashboard')}</span>
        </Button>
        <Button render={<Link href="/exam" />} nativeButton={false}>
          <span>{t('startMockExam')}</span>
        </Button>
      </footer>

    </div>
  );
}


