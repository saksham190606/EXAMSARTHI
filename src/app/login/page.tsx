"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, LogIn, Lock, Eye, EyeOff, AlertCircle, Mic, CheckCircle2, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { subscribe } from '@/lib/voice/useVoiceEngine';
import { speak, unlockAudioContext, voiceEngine } from '@/lib/accessibility/voice-companion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type VoiceLoginStep = 'IDLE' | 'AWAITING_USER_ID' | 'AWAITING_PASSWORD' | 'AUTHENTICATING' | 'SUCCESS';

function parseSpokenUserId(rawText: string): string | null {
  const clean = rawText.toLowerCase().trim();
  if (!clean) return null;

  // Ignore prompts or echo of "user id", "id", etc.
  if (/^(user\s*id|id|username|user|my\s*user\s*id|please\s*say\s*your\s*user\s*id|यूजर\s*आईडी|आईडी)$/i.test(clean)) {
    return null;
  }

  // Normalizations: "zero one" -> "01", "0 1" -> "01", etc.
  const normalized = clean
    .replace(/\bzero\s+one\b/g, '01')
    .replace(/\bzero\s+1\b/g, '01')
    .replace(/\b0\s+1\b/g, '01')
    .replace(/\bzero\b/g, '0')
    .replace(/\bone\b/g, '1')
    .replace(/\s+/g, '');

  if (
    normalized.includes('priyansh01') ||
    normalized.includes('priyansh1') ||
    normalized.includes('priyansh') ||
    normalized.includes('priyanshh')
  ) {
    return 'priyansh01';
  }

  if (normalized.includes('demo')) {
    return 'demo';
  }

  // Strip prefixes like "my user id is", "user id is"
  const stripped = clean
    .replace(/^.*?(?:user\s*id\s*(?:is)?|id\s*(?:is)?)\s*/i, '')
    .trim()
    .replace(/\s+/g, '');

  if (
    stripped.includes('priyansh01') ||
    stripped.includes('priyansh')
  ) {
    return 'priyansh01';
  }

  if (stripped.length >= 3 && stripped !== 'userid') {
    return stripped;
  }

  return null;
}

function parseSpokenPassword(rawText: string): string | null {
  const clean = rawText.toLowerCase().trim();
  if (!clean) return null;

  // Direct fast-path check for 12345 or commonly clipped 2345 variants
  if (
    clean.includes('12345') ||
    clean.includes('1 2 3 4 5') ||
    clean.includes('2345') ||
    clean.includes('2 3 4 5') ||
    clean.includes('twenty three forty five') ||
    /(?:^|\s)(?:one|won|wan|when|van|uno|ek|एक)?\s*(?:two|to|too|tu|do|दो)\s*(?:three|tri|tree|teen|तीन)\s*(?:four|for|char|chaar|चार)\s*(?:five|faiv|faive|panch|paanch|पाँच|पांच)(?:\s|$)/i.test(clean)
  ) {
    return '12345';
  }

  // Convert Hindi & English number words and homophones to digits
  const converted = clean
    .replace(/(?:\b|^)(?:zero|shunya|शून्य)(?:\b|$)/g, '0')
    .replace(/(?:\b|^)(?:one|won|wan|when|van|uno|ek|पहला)(?:\b|$)/g, '1')
    .replace(/(?:\b|^)(?:two|to|too|tu|do|doosra|दूसरा)(?:\b|$)/g, '2')
    .replace(/(?:\b|^)(?:three|tree|tri|teen|teesra|तीसरा)(?:\b|$)/g, '3')
    .replace(/(?:\b|^)(?:four|for|fore|char|chaar|chautha|चौथा)(?:\b|$)/g, '4')
    .replace(/(?:\b|^)(?:five|faiv|faive|panch|paanch|paanchwa|पाँच|पांच)(?:\b|$)/g, '5')
    .replace(/(?:\b|^)(?:six|chhah|छठा)(?:\b|$)/g, '6')
    .replace(/(?:\b|^)(?:seven|saat|सातवां)(?:\b|$)/g, '7')
    .replace(/(?:\b|^)(?:eight|ate|aath|आठवां)(?:\b|$)/g, '8')
    .replace(/(?:\b|^)(?:nine|nau|नौवां)(?:\b|$)/g, '9')
    .replace(/शून्य/g, '0')
    .replace(/एक/g, '1')
    .replace(/दो/g, '2')
    .replace(/तीन/g, '3')
    .replace(/चार/g, '4')
    .replace(/(?:पाँच|पांच)/g, '5')
    .replace(/छह/g, '6')
    .replace(/सात/g, '7')
    .replace(/आठ/g, '8')
    .replace(/नौ/g, '9')
    .replace(/[०]/g, '0')
    .replace(/[१]/g, '1')
    .replace(/[२]/g, '2')
    .replace(/[३]/g, '3')
    .replace(/[४]/g, '4')
    .replace(/[५]/g, '5');

  const digitsOnly = converted.replace(/\D/g, '');

  if (digitsOnly.includes('12345') || digitsOnly === '2345' || digitsOnly.endsWith('2345')) {
    return '12345';
  }

  return digitsOnly.length >= 4 ? digitsOnly : null;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams?.get('redirectTo') || '/dashboard';
  const redirectTo = (rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')) ? rawRedirect : '/dashboard';

  const { signIn } = useAuth();
  const isHindi = useAccessibilityStore((s) => s.language === 'hi');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [voiceStep, setVoiceStep] = useState<VoiceLoginStep>('IDLE');
  const [voicePromptMessage, setVoicePromptMessage] = useState<string>('');
  const voiceStepRef = useRef<VoiceLoginStep>('IDLE');
  const hasSpokenWelcomeRef = useRef(false);
  const isSubmittingRef = useRef(false);

  // 1. Initial Voice Greeting with Demo Credentials & User ID Prompt
  useEffect(() => {
    const triggerWelcomePrompt = () => {
      if (hasSpokenWelcomeRef.current) return;
      hasSpokenWelcomeRef.current = true;
      voiceStepRef.current = 'AWAITING_USER_ID';
      setVoiceStep('AWAITING_USER_ID');

      const welcomeText = isHindi
        ? "कृपया अपनी यूजर आईडी बोलें।"
        : "Please say your user ID.";

      setVoicePromptMessage(
        isHindi
          ? "सुन रहे हैं: कृपया अपनी यूजर आईडी बोलें ('priyansh01')"
          : "Listening: Please say your user ID ('priyansh01')"
      );

      setTimeout(() => {
        unlockAudioContext();
        speak(welcomeText, {
          cancelPrevious: true,
          lang: isHindi ? 'hi-IN' : 'en-US',
          onEnd: () => {
            unlockAudioContext();
            voiceEngine.startAlwaysOnListening();
          },
        });
      }, 500);
    };

    triggerWelcomePrompt();

    const handleGesture = () => {
      unlockAudioContext();
      if (!hasSpokenWelcomeRef.current) {
        triggerWelcomePrompt();
      }
    };

    window.addEventListener('pointerdown', handleGesture, { once: true, passive: true });
    window.addEventListener('click', handleGesture, { once: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('click', handleGesture);
    };
  }, [isHindi]);

  // 2. Continuous Voice Recognition Listener for User ID and Password
  useEffect(() => {
    return subscribe(async (transcript) => {
      const lower = transcript.toLowerCase().trim();
      if (!lower) return;

      console.log('[VoiceLogin] Received transcript:', lower, 'Step:', voiceStepRef.current);

      // STEP 1: Awaiting User ID
      if (voiceStepRef.current === 'AWAITING_USER_ID') {
        const detectedUserId = parseSpokenUserId(lower);
        if (detectedUserId) {
          setEmail(detectedUserId);
          voiceStepRef.current = 'AWAITING_PASSWORD';
          setVoiceStep('AWAITING_PASSWORD');
          setErrorMessage(null);

          const askPasswordText = isHindi
            ? "कृपया अपना पासवर्ड बोलें।"
            : "Please say your password.";

          setVoicePromptMessage(
            isHindi
              ? "सुन रहे हैं: कृपया अपना पासवर्ड बोलें ('12345')"
              : "Listening: Please say your password ('12345')"
          );

          unlockAudioContext();
          speak(askPasswordText, {
            cancelPrevious: true,
            lang: isHindi ? 'hi-IN' : 'en-US',
            onEnd: () => {
              unlockAudioContext();
              voiceEngine.startAlwaysOnListening();
            },
          });
        }
        return;
      }

      // STEP 2: Awaiting Password
      if (voiceStepRef.current === 'AWAITING_PASSWORD') {
        if (lower.includes('restart') || lower.includes('change user') || lower.includes('user id') || lower.includes('रिस्टार्ट')) {
          voiceStepRef.current = 'AWAITING_USER_ID';
          setVoiceStep('AWAITING_USER_ID');
          const resetText = isHindi
            ? "कृपया अपनी यूजर आईडी बोलें।"
            : "Please say your user ID.";
          setVoicePromptMessage(resetText);
          speak(resetText, { lang: isHindi ? 'hi-IN' : 'en-US' });
          return;
        }

        const detectedPassword = parseSpokenPassword(lower);
        if (detectedPassword && !isSubmittingRef.current) {
          setPassword(detectedPassword);
          const currentUserId = email.trim() || 'priyansh01';

          const isValid =
            (currentUserId.toLowerCase().includes('priyansh') || currentUserId.toLowerCase().includes('demo')) &&
            detectedPassword === '12345';

          if (isValid) {
            isSubmittingRef.current = true;
            voiceStepRef.current = 'AUTHENTICATING';
            setVoiceStep('AUTHENTICATING');
            setLoading(true);

            const successText = isHindi
              ? "क्रेडेंशियल सत्यापित। डैशबोर्ड पर ले जाया जा रहा है।"
              : "Credentials verified. Logging in to dashboard.";

            setVoicePromptMessage(successText);

            // Execute signIn immediately so cookies & localStorage are synchronous!
            await signIn(currentUserId, detectedPassword);

            unlockAudioContext();
            let hasNavigated = false;
            const navigateToDashboard = () => {
              if (hasNavigated) return;
              hasNavigated = true;
              router.push(redirectTo);
            };

            speak(successText, {
              cancelPrevious: true,
              lang: isHindi ? 'hi-IN' : 'en-US',
              onEnd: () => {
                navigateToDashboard();
              },
            });

            // Guaranteed navigation fallback within 1.2s
            setTimeout(() => {
              navigateToDashboard();
            }, 1200);
          } else {
            const failText = isHindi
              ? "गलत क्रेडेंशियल। कृपया पासवर्ड 1 2 3 4 5 बोलें, या यूजर आईडी बदलने के लिए 'रिस्टार्ट' बोलें।"
              : "Incorrect password. Please say password 1 2 3 4 5, or say 'restart' to change User ID.";

            setVoicePromptMessage(failText);
            setErrorMessage(isHindi ? "गलत क्रेडेंशियल दर्ज किए गए हैं।" : "Incorrect credentials entered.");
            speak(failText, { lang: isHindi ? 'hi-IN' : 'en-US' });
          }
        }
      }
    });
  }, [email, isHindi, redirectTo, router, signIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const loginId = email.trim();
    if (!loginId || !password) {
      setErrorMessage('Please provide both User ID and password.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signIn(loginId, password);
      if (error) {
        setErrorMessage(error.message || 'Invalid User ID or password.');
        setLoading(false);
      } else {
        router.push(redirectTo);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during sign-in.');
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-none border border-neutral-300 dark:border-white/20 rounded-none bg-card">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto size-11 rounded-[2px] bg-primary text-black flex items-center justify-center mb-1">
          <LogIn className="size-5" aria-hidden="true" />
        </div>
        <CardTitle className="font-heading text-2xl font-bold tracking-tight text-foreground leading-[0.95]">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
          Sign in to access your examinations, practice modules, and performance analytics.
        </CardDescription>

        {/* Demo Credentials & Voice Guidance Box */}
        <div className="rounded-[2px] border border-primary/30 bg-primary/10 px-3 py-2 text-left text-xs">
          <div className="flex items-center justify-between font-semibold text-foreground">
            <span className="flex items-center gap-1.5 text-primary-foreground dark:text-primary">
              <Mic className="h-3.5 w-3.5 animate-pulse text-emerald-500" />
              Voice Login Active
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">DEMO</span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
            <span>User ID: <strong className="font-mono text-foreground font-semibold">priyansh01</strong></span>
            <span>Password: <strong className="font-mono text-foreground font-semibold">12345</strong></span>
          </div>
          {voicePromptMessage && (
            <div className="mt-1.5 text-[11px] font-medium text-primary-foreground dark:text-primary border-t border-primary/20 pt-1">
              {voicePromptMessage}
            </div>
          )}
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-4">
          {errorMessage && (
            <Alert variant="destructive" role="alert" aria-live="assertive" className="text-sm">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sign-in Failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="login-email">User ID / Email Address</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="login-email"
                name="email"
                type="text"
                autoComplete="username"
                required
                placeholder="priyansh01"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 font-mono"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">Password</Label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="12345"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-10 font-mono"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded p-0.5"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full text-sm h-12 font-bold tracking-[0.144px] rounded-[2px] bg-primary text-black hover:bg-primary-deep"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-none border-2 border-solid border-current border-r-transparent" />
                Signing In...
              </span>
            ) : (
              'Sign In'
            )}
          </Button>

          <p className="text-sm text-center text-neutral-600 dark:text-neutral-400">
            Don&apos;t have an account?{' '}
            <Link
              href={redirectTo !== '/dashboard' ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}` : '/signup'}
              className="font-bold text-foreground hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground rounded-[2px]"
            >
              Sign Up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12 relative">
      <div className="w-full max-w-md mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Home</span>
        </Link>
        <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
          Portal Sign In
        </span>
      </div>

      <div className="w-full max-w-md">
        <Suspense fallback={
          <Card className="w-full max-w-md p-8 text-center rounded-2xl border-border/80">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
            <p className="mt-4 text-sm text-muted-foreground">Loading sign-in form...</p>
          </Card>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
