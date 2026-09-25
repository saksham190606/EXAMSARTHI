"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, LogIn, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams?.get('redirectTo') || '/dashboard';
  const redirectTo = (rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')) ? rawRedirect : '/dashboard';

  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        setErrorMessage(error.message || 'Invalid email or password.');
      } else {
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during sign-in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-border/60">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
          <LogIn className="w-6 h-6" aria-hidden="true" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Welcome Back</CardTitle>
        <CardDescription>
          Sign in to access your examinations, practice modules, and performance analytics.
        </CardDescription>
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
            <Label htmlFor="login-email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="login-email"
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
                Signing In...
              </span>
            ) : (
              'Sign In'
            )}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href={redirectTo !== '/dashboard' ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}` : '/signup'}
              className="font-medium text-primary hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
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
          <p className="mt-4 text-sm text-muted-foreground">Loading sign-in form...</p>
        </Card>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
