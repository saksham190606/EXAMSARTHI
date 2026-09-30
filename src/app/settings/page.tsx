"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings2, Sliders, Eye, SunMoon, Volume2, Move, Globe, User, CheckCircle2, AlertCircle, Play, Square, Sparkles, Palette, RotateCcw, Bot, Keyboard } from 'lucide-react';
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
    language, setLanguage,
    accessibilityMode,
  } = useAccessibilityStore();

  const isHindi = language === 'hi';
  const isKeyboardMode = accessibilityMode === 'keyboard';

  const handleThemeChange = (themeVal: ColorTheme) => {
    setColorTheme(themeVal);
    const names: Record<ColorTheme, { en: string; hi: string }> = {
      default: { en: 'Default standard UI theme applied.', hi: 'मानक डिफ़ॉल्ट यूआई थीम बहाल की गई।' },
      deuteranopia: { en: 'Deuteranopia red-green accessible palette applied.', hi: 'ड्यूटरेनोपिया (लाल-हरा सुरक्षित) पैलेट लागू किया गया।' },
      protanopia: { en: 'Protanopia red-weak accessible cyan palette applied.', hi: 'प्रोटानोपिया (लाल-कमजोरी सुरक्षित) पैलेट लागू किया गया।' },
      tritanopia: { en: 'Tritanopia blue-yellow accessible palette applied.', hi: 'ट्रिटेनोपिया (नीला-पीला सुरक्षित) पैलेट लागू किया गया।' },
      monochrome: { en: 'Monochrome high-contrast grayscale palette applied.', hi: 'मोनोक्रोम उच्च-कंट्रास्ट ग्रेस्केल पैलेट लागू किया गया।' },
      sepia: { en: 'Warm sepia anti-glare palette applied.', hi: 'वार्म सेपिया एंटी-ग्लेयर पैलेट लागू किया गया।' },
    };
    const announcement = isHindi ? names[themeVal]?.hi : names[themeVal]?.en;
    speak(announcement || 'Theme updated', { cancelPrevious: true });
  };

  useEffect(() => {
    const handleNumberKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const map: Record<string, ColorTheme> = {
        '1': 'default',
        '2': 'deuteranopia',
        '3': 'protanopia',
        '4': 'tritanopia',
        '5': 'monochrome',
        '6': 'sepia',
      };
      if (map[e.key]) {
        handleThemeChange(map[e.key]);
      }
    };
    window.addEventListener('keydown', handleNumberKey);
    return () => window.removeEventListener('keydown', handleNumberKey);
  }, [language]);
  
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
            <div className="space-y-4 pt-4 border-t border-border/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" aria-hidden="true" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {isHindi ? 'रंग दृष्टि और इंटरफ़ेस थीम्स' : 'Color Vision & Interface Themes'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {isHindi ? 'विभिन्न रंग दृष्टि आवश्यकताओं के लिए विशेष रूप से डिज़ाइन किए गए कंट्रास्ट पैलेट' : 'Curated accessible color combinations for color blindness & visual comfort'}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-2xs font-mono border-primary/40 bg-primary/10 text-primary">
                  {isHindi ? 'सक्रिय थीम' : 'Active'}: {
                    colorTheme === 'deuteranopia' ? (isHindi ? 'ड्यूटरेनोपिया' : 'Deuteranopia') :
                    colorTheme === 'protanopia' ? (isHindi ? 'प्रोटानोपिया' : 'Protanopia') :
                    colorTheme === 'tritanopia' ? (isHindi ? 'ट्रिटानोपिया' : 'Tritanopia') :
                    colorTheme === 'monochrome' ? (isHindi ? 'मोनोक्रोम' : 'Monochrome') :
                    colorTheme === 'sepia' ? (isHindi ? 'वार्म सेपिया' : 'Warm Sepia') :
                    (isHindi ? 'मानक डिफ़ॉल्ट (मूल यूआई)' : 'Default (Standard UI)')
                  }
                </Badge>
              </div>

              {/* Sarthi Assistant & Keyboard Shortcuts Helper Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-[2px] border border-primary/20 bg-primary/5 text-xs text-foreground">
                <div className="flex items-center gap-2">
                  <Keyboard className="size-4 text-primary shrink-0" aria-hidden="true" />
                  <span className="leading-relaxed">
                    {isHindi
                      ? 'कीबोर्ड मोड: किसी भी पेज पर "T" दबाकर थीम बदलें, या यहाँ 1 से 6 दबाएं। रंग सुझाव के लिए सारथी से पूछें।'
                      : 'Keyboard Navigation: Press "T" anywhere across EXAMSARTHI to cycle palettes, or press keys 1–6 here. Ask Sarthi anytime for guidance.'}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      const query = isHindi 
                        ? 'मुझे कलर ब्लाइंडनेस है, कौन सा थीम चुनूं?' 
                        : 'I have color blindness, which color theme should I use?';
                      window.dispatchEvent(new CustomEvent('examsarthi-open-sarthi', { detail: { query } }));
                      window.dispatchEvent(new CustomEvent('open_sarthi', { detail: { query } }));
                    }
                  }}
                  className="h-7 text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 shrink-0"
                >
                  <Bot className="size-3.5" aria-hidden="true" />
                  <span>{isHindi ? 'सारथी से रंग सुझाव लें' : 'Ask Sarthi for Color Advice'}</span>
                </Button>
              </div>

              {/* Interactive Palette Cards Matrix */}
              <div 
                role="radiogroup" 
                aria-label={isHindi ? "रंग थीम विकल्प" : "Color Theme Options"}
                className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1"
              >
                {[
                  {
                    id: 'default' as ColorTheme,
                    keyNum: '1',
                    nameEn: 'Current UI Theme (Default)',
                    nameHi: 'वर्तमान यूआई थीम (डिफ़ॉल्ट)',
                    badgeEn: 'Default Standard',
                    badgeHi: 'मानक डिफ़ॉल्ट',
                    conditionEn: 'Standard Dark UI',
                    conditionHi: 'मानक डार्क यूआई',
                    descEn: 'Our signature sleek dark UI with vibrant gold-amber (#ffed00) accents. Preserved as the default interface colors.',
                    descHi: 'वाइब्रेंट गोल्डन-एम्बर (#ffed00) के साथ हमारा मूल डार्क इंटरफ़ेस। डिफ़ॉल्ट रूप में हमेशा सक्रिय।',
                    accentColor: '#ffed00',
                    bgPreview: '#09090b',
                    borderPreview: '#27272a',
                    textColor: '#fafafa',
                    pillText: 'Default Amber',
                    pillTextCol: '#000000',
                    swatches: ['#09090b', '#18181b', '#27272a', '#ffed00'],
                  },
                  {
                    id: 'deuteranopia' as ColorTheme,
                    keyNum: '2',
                    nameEn: 'Deuteranopia Safe',
                    nameHi: 'ड्यूटेरानोपिया सुरक्षित',
                    badgeEn: 'Green-Weak / Red-Green Safe',
                    badgeHi: 'हरा-कमजोरी / लाल-हरा सुरक्षित',
                    conditionEn: 'Deuteranomaly & Deuteranopia',
                    conditionHi: 'ड्यूटेरैनोमली व ड्यूटेरानोपिया',
                    descEn: 'High-contrast cobalt blue (#38bdf8) and warm gold eliminate red-green ambiguity for the most common color vision deficiency.',
                    descHi: 'लाल-हरे रंग के भ्रम को दूर करने के लिए हाई-कंट्रास्ट कोबाल्ट नीला और सुनहरा एम्बर।',
                    accentColor: '#38bdf8',
                    bgPreview: '#0b1329',
                    borderPreview: '#1e3a8a',
                    textColor: '#f0f9ff',
                    pillText: 'Cobalt Blue',
                    pillTextCol: '#000000',
                    swatches: ['#030712', '#082f49', '#0284c7', '#38bdf8'],
                  },
                  {
                    id: 'protanopia' as ColorTheme,
                    keyNum: '3',
                    nameEn: 'Protanopia Safe',
                    nameHi: 'प्रोटानोपिया सुरक्षित',
                    badgeEn: 'Red-Weak / Long-Wavelength Safe',
                    badgeHi: 'लाल-कमजोरी सुरक्षित',
                    conditionEn: 'Protanomaly & Protanopia',
                    conditionHi: 'प्रोटैनोमली व प्रोटानोपिया',
                    descEn: 'High-luminance electric cyan (#22d3ee) ensures red questions, alerts, and markers never appear dim or disappear into black.',
                    descHi: 'चमकदार इलेक्ट्रिक सियान (#22d3ee) सुनिश्चित करता है कि लाल तत्व कभी काले या धुंधले न दिखें।',
                    accentColor: '#22d3ee',
                    bgPreview: '#081726',
                    borderPreview: '#155e75',
                    textColor: '#ecfeff',
                    pillText: 'Electric Cyan',
                    pillTextCol: '#000000',
                    swatches: ['#020617', '#083344', '#0891b2', '#22d3ee'],
                  },
                  {
                    id: 'tritanopia' as ColorTheme,
                    keyNum: '4',
                    nameEn: 'Tritanopia Safe',
                    nameHi: 'ट्रिटानोपिया सुरक्षित',
                    badgeEn: 'Blue-Yellow Safe',
                    badgeHi: 'नीला-पीला सुरक्षित',
                    conditionEn: 'Tritanomaly & Tritanopia',
                    conditionHi: 'ट्रिटैनोमली व ट्रिटानोपिया',
                    descEn: 'Vivid coral rose (#fb7185) paired with crisp teal allows immediate distinction without relying on blue-yellow spectrum.',
                    descHi: 'विशिष्ट कोरल रोज़ (#fb7185) और सीफ़ोम टील, नीले और पीले रंग के दोष वाले परीक्षार्थियों के लिए पूर्ण सुरक्षित।',
                    accentColor: '#fb7185',
                    bgPreview: '#1f1017',
                    borderPreview: '#881337',
                    textColor: '#fff1f2',
                    pillText: 'Coral Rose',
                    pillTextCol: '#000000',
                    swatches: ['#0f050b', '#4c0519', '#e11d48', '#fb7185'],
                  },
                  {
                    id: 'monochrome' as ColorTheme,
                    keyNum: '5',
                    nameEn: 'Monochrome Grayscale',
                    nameHi: 'मोनोक्रोम उच्च-कंट्रास्ट',
                    badgeEn: 'Total Color Blindness (Achromatopsia)',
                    badgeHi: 'पूर्ण रंग अंधापन (एक्रोमैटोप्सिया)',
                    conditionEn: 'Achromatopsia & Extreme Sensitivity',
                    conditionHi: 'एक्रोमैटोप्सिया व कंट्रास्ट ज़रूरतें',
                    descEn: '100% grayscale with stark boundary contrast (#ffffff) and distinct shape signifiers for total color blindness.',
                    descHi: 'पूर्ण रंग अंधापन के लिए अत्यधिक स्पष्टता, 100% ब्लैक एंड व्हाइट सीमा कंट्रास्ट और स्पष्ट आइकन संकेत।',
                    accentColor: '#ffffff',
                    bgPreview: '#000000',
                    borderPreview: '#ffffff',
                    textColor: '#ffffff',
                    pillText: 'Pure White',
                    pillTextCol: '#000000',
                    swatches: ['#000000', '#27272a', '#a1a1aa', '#ffffff'],
                  },
                  {
                    id: 'sepia' as ColorTheme,
                    keyNum: '6',
                    nameEn: 'Warm Sepia Anti-Glare',
                    nameHi: 'वार्म सेपिया एंटी-ग्लेयर',
                    badgeEn: 'Photophobia & Eye Strain Relief',
                    badgeHi: 'फोटोफोबिया व आँखों का तनाव राहत',
                    conditionEn: 'Photophobia & Visual Stress',
                    conditionHi: 'फोटोफोबिया व आँखों की थकान',
                    descEn: 'Soft golden amber (#e09f53) and espresso charcoal soothe light sensitivity, migraines, and prolonged exam fatigue.',
                    descHi: 'मुलायम गोल्डन एम्बर और एस्प्रेसो चारकोल टोन कठोर नीली रोशनी को रोककर आँखों को लंबे समय तक तनावमुक्त रखते हैं।',
                    accentColor: '#e09f53',
                    bgPreview: '#1c1611',
                    borderPreview: '#5c4532',
                    textColor: '#f4e6d4',
                    pillText: 'Warm Amber',
                    pillTextCol: '#1c140c',
                    swatches: ['#1c1611', '#281f18', '#8c531b', '#e09f53'],
                  },
                ].map((palette) => {
                  const isSelected = (colorTheme || 'default') === palette.id;
                  return (
                    <div
                      key={palette.id}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => handleThemeChange(palette.id)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          handleThemeChange(palette.id);
                        }
                      }}
                      className={`relative flex flex-col justify-between p-3.5 rounded-[2px] border cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isSelected 
                          ? 'border-primary bg-primary/10 shadow-[0_0_14px_rgba(var(--primary),0.15)] ring-1 ring-primary' 
                          : 'border-border/70 hover:border-border hover:bg-muted/30 bg-card/60'
                      }`}
                    >
                      {/* Top Header Row with Swatches & Hotkey */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5" aria-hidden="true">
                            {palette.swatches.map((colorHex, idx) => (
                              <span 
                                key={idx} 
                                className="size-3.5 rounded-full border border-black/30 shadow-xs" 
                                style={{ backgroundColor: colorHex }}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-muted border border-border text-muted-foreground">
                              Key: {palette.keyNum}
                            </kbd>
                            {isSelected && (
                              <Badge className="h-5 px-1.5 text-[10px] font-bold gap-1 bg-primary text-primary-foreground border-none">
                                <CheckCircle2 className="size-3" aria-hidden="true" />
                                <span>{isHindi ? 'सक्रिय' : 'Active'}</span>
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Title and Condition Badge */}
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-foreground">
                            {isHindi ? palette.nameHi : palette.nameEn}
                          </h4>
                          <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40">
                            {isHindi ? palette.badgeHi : palette.badgeEn}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {isHindi ? palette.descHi : palette.descEn}
                        </p>
                      </div>

                      {/* Bottom Live Micro-Preview */}
                      <div 
                        className="mt-3 p-2 rounded-[2px] border text-[11px] flex items-center justify-between gap-2"
                        style={{ 
                          backgroundColor: palette.bgPreview, 
                          borderColor: palette.borderPreview,
                          color: palette.textColor 
                        }}
                        aria-hidden="true"
                      >
                        <span className="text-[10px] font-medium opacity-90 truncate">
                          {isHindi ? palette.conditionHi : palette.conditionEn}
                        </span>
                        <span 
                          className="px-2 py-0.5 rounded-[2px] text-[10px] font-bold shrink-0"
                          style={{ 
                            backgroundColor: palette.accentColor, 
                            color: palette.pillTextCol 
                          }}
                        >
                          {palette.pillText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Quick Reset Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleThemeChange('default')}
                  disabled={(colorTheme || 'default') === 'default'}
                  className="h-8 text-xs font-bold gap-1.5 border-border"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  <span>{isHindi ? 'डिफ़ॉल्ट यूआई थीम बहाल करें' : 'Restore Default UI Theme'}</span>
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  {isHindi ? 'वर्तमान यूआई हमेशा मानक डिफ़ॉल्ट रहेगा।' : 'Current UI remains active default across all sessions.'}
                </p>
              </div>
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


