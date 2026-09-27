"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogIn, LogOut, LayoutDashboard, Settings, Mic } from "lucide-react"
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
import { Language, useAccessibilityStore } from "@/store/useAccessibilityStore"
import { useTranslation } from "@/lib/i18n"
import { useAuth } from "@/hooks/useAuth"
import { voiceEngine } from "@/lib/accessibility/voice-companion"

import { cn } from "@/lib/utils"

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { t, language, setLanguage } = useTranslation()
  const { user, profile, loading, signOut } = useAuth()
  const isListeningCommands = useAccessibilityStore((s) => s.isListeningCommands)

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
    <header className="sticky top-0 z-50 w-full h-[60px] border-b border-white/16 bg-black text-white">
      <div className="container flex h-full items-center justify-between mx-auto px-4 sm:px-8">
        
        <div className="flex items-center gap-6">
          <MobileNav />
          <Link 
            href="/" 
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffed00] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-[2px] motion-safe:active:scale-[0.97] motion-reduce:transform-none transition-transform duration-150"
          >
            {/* Modern flat-line rhombus diamond logo */}
            <div className="relative size-6 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="size-6 text-white" fill="currentColor">
                <path d="M12 2L2 12l10 10 10-10L12 2zm0 3.8L18.2 12 12 18.2 5.8 12 12 5.8z" />
              </svg>
              <span className="absolute size-1.5 bg-primary rounded-none" />
            </div>
            <span className="font-heading font-bold text-lg tracking-tight text-white">
              EXAMSARTHI
            </span>
          </Link>
          
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-1 text-[14px] font-bold tracking-[0.144px] ml-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  {...(isActive ? { "aria-current": "page" } : {})}
                  className={cn(
                    "relative py-2 px-3 text-sm transition-colors duration-150 rounded-[2px]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffed00] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                    "motion-safe:active:scale-[0.97] motion-reduce:transform-none",
                    "after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-[2px] after:bg-[#ffed00] after:transition-all after:duration-150 after:ease-out",
                    isActive
                      ? "text-white font-bold after:w-full"
                      : "text-white/70 font-medium hover:text-white after:w-0 hover:after:w-full"
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="hidden sm:block">
            <Select 
              value={language} 
              onValueChange={(val) => setLanguage(val as Language)}
            >
              <SelectTrigger 
                className={cn(
                  "w-[120px] h-9 text-xs font-semibold rounded-[2px] border border-white/20 bg-black text-white shadow-none",
                  "hover:bg-white/10 hover:border-white/40 transition-all duration-120 ease-out",
                  "motion-safe:active:scale-95 motion-reduce:transform-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffed00] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                )} 
                aria-label={t('selectLanguage')}
              >
                <SelectValue placeholder={t('language')} />
              </SelectTrigger>
              <SelectContent className="rounded-none border-white/20 bg-neutral-950 text-white">
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Accessibility Settings */}
          <AccessibilityPanel />

          {/* Voice Command Assistant Button (Alt + V) */}
          <button
            type="button"
            onClick={() => voiceEngine.toggle()}
            aria-pressed={isListeningCommands}
            aria-label={
              isListeningCommands
                ? "Voice commands listening. Press to pause (Alt + V)"
                : "Enable voice navigation commands (Alt + V)"
            }
            title="Voice navigation commands (Alt + V)"
            className={cn(
              "relative size-9 inline-flex items-center justify-center rounded-[2px] border text-xs font-bold transition-all duration-150 cursor-pointer shadow-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffed00] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
              isListeningCommands
                ? "bg-[#ffed00] text-black border-[#ffed00] shadow-[0_0_12px_rgba(255,237,0,0.5)] animate-pulse"
                : "border-white/20 bg-black text-white hover:bg-white/10 hover:border-white/40"
            )}
          >
            <Mic className="size-4" aria-hidden="true" />
            {isListeningCommands && (
              <span className="absolute -top-1 -right-1 size-2 bg-emerald-400 rounded-full animate-ping" />
            )}
          </button>
          
          {/* Authentication State */}
          {loading ? (
            <div className="size-9 flex items-center justify-center" aria-hidden="true">
              <span className="inline-block size-4 animate-spin rounded-none border-2 border-solid border-primary border-r-transparent" />
            </div>
          ) : user ? (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    "group flex items-center gap-2 rounded-[2px] px-2 py-1 text-left cursor-pointer border border-transparent bg-transparent text-white",
                    "hover:border-white/40 hover:bg-white/5 transition-all duration-150",
                    "motion-safe:active:scale-[0.98] motion-reduce:transform-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffed00] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  )}
                  aria-label={`User account menu for ${candidateName}`}
                >
                  <div className="size-7 rounded-[2px] bg-[#ffed00] text-black flex items-center justify-center font-bold text-xs tracking-tight transition-transform duration-150 motion-safe:group-hover:scale-105 motion-reduce:transform-none shrink-0 shadow-none">
                    {candidateInitial}
                  </div>
                  <span className="hidden lg:inline-block text-xs font-semibold max-w-[130px] truncate text-white">
                    {candidateName}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1 rounded-none border border-white/20 bg-neutral-950 text-white shadow-none">
                  <DropdownMenuLabel className="font-normal px-2 py-1.5">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-bold leading-none text-white">
                        {candidateName}
                      </p>
                      <p className="text-xs leading-none text-neutral-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/16" />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => router.push('/dashboard')} className="cursor-pointer gap-2 rounded-none hover:bg-white/10 focus:bg-white/10 focus:text-white text-white">
                      <LayoutDashboard className="size-4" />
                      <span>{t('navDashboard')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer gap-2 rounded-none hover:bg-white/10 focus:bg-white/10 focus:text-white text-white">
                      <Settings className="size-4" />
                      <span>{t('navSettings')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="bg-white/16" />
                  <DropdownMenuItem 
                    onClick={handleSignOut} 
                    variant="destructive"
                    className="cursor-pointer gap-2 rounded-none hover:bg-destructive/20 focus:bg-destructive/20"
                  >
                    <LogOut className="size-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button 
                type="button"
                onClick={handleSignOut}
                aria-label="Sign out of account"
                className={cn(
                  "group inline-flex items-center justify-center h-9 px-3 gap-1.5 text-xs font-bold rounded-[2px] border border-white/30 bg-transparent text-white shadow-none transition-all duration-150",
                  "hover:border-[#ffed00] hover:text-[#ffed00] hover:bg-[#ffed00]/10",
                  "motion-safe:active:scale-[0.96] active:bg-[#ffed00]/20 motion-reduce:transform-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffed00] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                  "[&_svg]:transition-transform [&_svg]:duration-150 group-hover:[&_svg]:translate-x-0.5 motion-reduce:[&_svg]:transform-none"
                )}
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <Link 
              href="/login"
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffed00] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-[2px]"
            >
              <Button 
                variant="default" 
                size="sm" 
                className="h-9 px-4 gap-1.5 text-xs font-bold rounded-[2px] bg-primary text-black hover:bg-primary-deep hover:shadow-[0_4px_12px_rgba(255,237,0,0.3)] motion-safe:active:scale-[0.97] motion-reduce:transform-none transition-all duration-150"
              >
                <LogIn className="size-4" aria-hidden="true" />
                <span>Log In</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
