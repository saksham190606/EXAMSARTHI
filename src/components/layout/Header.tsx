"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserCircle } from "lucide-react"

import { AccessibilityPanel } from "@/components/accessibility/AccessibilityPanel"
import { MobileNav } from "@/components/layout/MobileNav"
import { useVoiceFeedback } from "@/hooks/useVoiceFeedback"
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

export function Header() {
  const pathname = usePathname()
  const { t, language, setLanguage } = useTranslation()
  const { speakFeedback } = useVoiceFeedback()
  const [prevPath, setPrevPath] = React.useState(pathname)

  const navItems = React.useMemo(() => [
    { href: "/dashboard", label: t('navDashboard') },
    { href: "/practice", label: t('navPractice') },
    { href: "/exam", label: t('navExams') },
    { href: "/results", label: t('navResults') },
    { href: "/settings", label: t('navSettings') },
  ], [t]);

  React.useEffect(() => {
    if (pathname !== prevPath) {
      setPrevPath(pathname);
      const item = navItems.find(i => i.href === pathname);
      if (item) {
        speakFeedback(item.label);
      } else if (pathname === '/') {
        speakFeedback('Home');
      }
    }
  }, [pathname, prevPath, speakFeedback, navItems]);

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
              onValueChange={(val) => {
                setLanguage(val as Language)
                speakFeedback(val === 'en' ? 'Language changed to English' : 'भाषा बदलकर हिंदी कर दी गई')
              }}
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
          <Button variant="ghost" size="icon" aria-label={t('userProfile')}>
            <UserCircle className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </header>
  )
}
