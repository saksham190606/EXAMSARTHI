"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Fingerprint } from "lucide-react"
import Link from "next/link"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPasskey, setLoadingPasskey] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handlePasskeyLogin = async () => {
    setLoadingPasskey(true)
    setError(null)
    try {
      if ((supabase.auth as any).signInWithWebAuthn) {
          const { error } = await (supabase.auth as any).signInWithWebAuthn()
          if (error) throw error
          
          router.push("/dashboard")
          router.refresh()
      } else {
         throw new Error("Passkeys are not supported in this environment yet.")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Passkey")
    } finally {
      setLoadingPasskey(false)
    }
  }

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError("Please enter your email for Magic Link login")
      return
    }
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <h3 className="text-xl font-medium text-foreground">Check your email</h3>
        <p className="text-muted-foreground">
          We sent a magic link to <strong>{email}</strong> to sign you in securely.
        </p>
        <Button onClick={() => setSuccess(false)} variant="outline" className="w-full">
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div 
          className="p-3 text-sm text-destructive-foreground bg-destructive/90 rounded-md" 
          role="alert" 
          aria-live="assertive"
        >
          {error}
        </div>
      )}
      
      <Button 
        onClick={handlePasskeyLogin} 
        className="w-full text-lg py-6" 
        disabled={loadingPasskey || loading}
        aria-busy={loadingPasskey}
      >
        {loadingPasskey ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <Fingerprint className="mr-2 h-5 w-5" />
        )}
        Sign in with Passkey
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>

      <form onSubmit={handleMagicLinkLogin} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email" className="sr-only">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? "true" : "false"}
            className="focus-visible:ring-primary"
          />
        </div>

        <Button 
          type="submit" 
          variant="secondary"
          className="w-full" 
          disabled={loading || loadingPasskey}
          aria-busy={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send Magic Link
        </Button>
      </form>

      <div className="mt-4 text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/auth/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  )
}
