"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, UserPlus, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams?.get('redirectTo') || '/dashboard';
  const redirectTo = (rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')) ? rawRedirect : '/dashboard';

  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please provide an email address and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await signUp(email.trim(), password, fullName.trim() || undefined);
      if (error) {
        setErrorMessage(error.message || 'Failed to create account.');
      } else {
        if (data?.session) {
          // Automatic login upon signup
          router.push(redirectTo);
          router.refresh();
        } else {
          // Email confirmation may be required by Supabase auth configuration
          setSuccessMessage('Account created successfully! If email verification is enabled, please verify your email before logging in.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-border/60">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
          <UserPlus className="w-6 h-6" aria-hidden="true" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Create Account</CardTitle>
        <CardDescription>
          Join EXAMSARTHI to access full examinations, practice tests, and track your progress.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-4">
          {errorMessage && (
            <Alert variant="destructive" role="alert" aria-live="assertive" className="text-sm">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Registration Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert role="status" aria-live="polite" className="text-sm border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="signup-name">Full Name (Optional)</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="signup-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Candidate Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-9"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="candidate@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password">Password (min. 6 characters)</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="signup-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-10"
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

          <div className="space-y-2">
            <Label htmlFor="signup-confirm-password">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="signup-confirm-password"
                name="confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-9"
                disabled={loading}
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full text-base h-11 font-medium"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                Creating Account...
              </span>
            ) : (
              'Create Account'
            )}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{' '}
            <Link
              href={redirectTo !== '/dashboard' ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : '/login'}
              className="font-medium text-primary hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              Sign In
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Home</span>
        </Link>
      </div>

      <Suspense fallback={
        <Card className="w-full max-w-md p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading registration form...</p>
        </Card>
      }>
        <SignupForm />
      </Suspense>
    </div>
  );
}
