"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { UserCircle, LogOut } from "lucide-react"

import { AccessibilityPanel } from "@/components/accessibility/AccessibilityPanel"
import { MobileNav } from "@/components/layout/MobileNav"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Language } from "@/store/useAccessibilityStore"
import { useTranslation } from "@/lib/i18n"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { t, language, setLanguage } = useTranslation()
  const [user, setUser] = React.useState<User | null>(null)
  
  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )
    
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const navItems = [
    { href: "/dashboard", label: t('navDashboard') },
    { href: "/practice", label: t('navPractice') },
    { href: "/exam", label: t('navExams') },
    { href: "/results", label: t('navResults') },
    { href: "/settings", label: t('navSettings') },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between mx-auto px-4 sm:px-8">
        
        <div className="flex items-center gap-4">
          <MobileNav />
          <Link href="/" className="flex items-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">
            <span className="font-bold text-xl tracking-tight text-primary">EXAMSARTHI</span>
          </Link>
          
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6 text-sm font-medium ml-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                {...(pathname === item.href ? { "aria-current": "page" } : {})}
                className={`transition-colors hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm px-2 py-1 ${
                  pathname === item.href ? "text-foreground" : "text-foreground/60"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="hidden sm:block">
            <Select 
              value={language} 
              onValueChange={(val) => setLanguage(val as Language)}
            >
              <SelectTrigger className="w-[125px]" aria-label={t('selectLanguage')}>
                <SelectValue placeholder={t('language')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Accessibility Settings */}
          <AccessibilityPanel />
          
          {/* User Profile Placeholder */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-9 w-9">
                <UserCircle className="h-6 w-6" aria-label={t('userProfile')} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => router.push('/auth/login')}>
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
