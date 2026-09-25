"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserCircle, LogIn, LogOut, LayoutDashboard, Settings } from "lucide-react"
import { useRouter } from "next/navigation"

import { AccessibilityPanel } from "@/components/accessibility/AccessibilityPanel"
import { MobileNav } from "@/components/layout/MobileNav"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Language } from "@/store/useAccessibilityStore"
import { useTranslation } from "@/lib/i18n"
import { useAuth } from "@/hooks/useAuth"

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { t, language, setLanguage } = useTranslation()
  const { user, profile, loading, signOut } = useAuth()

  const candidateName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Candidate'
  const candidateInitial = candidateName.charAt(0).toUpperCase()

  const navItems = [
    { href: "/dashboard", label: t('navDashboard') },
    { href: "/practice", label: t('navPractice') },
    { href: "/exam", label: t('navExams') },
    { href: "/results", label: t('navResults') },
    { href: "/settings", label: t('navSettings') },
  ]

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

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
          
          {/* Authentication State */}
          {loading ? (
            <div className="w-9 h-9 flex items-center justify-center" aria-hidden="true">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent" />
            </div>
          ) : user ? (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 px-2 py-1 text-left cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors border border-transparent hover:border-border/50"
                  aria-label={`User account menu for ${candidateName}`}
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
                    {candidateInitial}
                  </div>
                  <span className="hidden lg:inline-block text-xs font-medium max-w-[120px] truncate text-foreground">
                    {candidateName}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1">
                  <DropdownMenuLabel className="font-normal px-2 py-1.5">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-foreground">
                        {candidateName}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => router.push('/dashboard')} className="cursor-pointer gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>{t('navDashboard')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer gap-2">
                      <Settings className="h-4 w-4" />
                      <span>{t('navSettings')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleSignOut} 
                    variant="destructive"
                    className="cursor-pointer gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                aria-label="Sign out of account"
                className="h-9 px-3 gap-1.5 text-xs sm:text-sm font-medium"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button 
                variant="default" 
                size="sm" 
                className="h-9 px-3.5 gap-1.5 text-xs sm:text-sm font-medium"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                <span>Log In</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
