"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import Link from "next/link"

export function SignUpForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Using OTP (Magic Link) as fallback / initial auth, redirecting to enroll page
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/enroll`,
        shouldCreateUser: true
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
        <Button onClick={() => router.push('/auth/login')} variant="outline" className="w-full">
          Back to login
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSignUp} className="space-y-6" noValidate>
      {error && (
        <div 
          className="p-3 text-sm text-destructive-foreground bg-destructive/90 rounded-md" 
          role="alert" 
          aria-live="assertive"
        >
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? "true" : "false"}
          className="focus-visible:ring-primary"
          placeholder="your@email.com"
        />
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={loading}
        aria-busy={loading}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Send Magic Link
      </Button>

      <div className="mt-4 text-center text-sm">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </form>
  )
}
