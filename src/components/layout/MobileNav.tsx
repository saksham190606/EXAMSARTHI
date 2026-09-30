"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, LogIn, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useTranslation } from "@/lib/i18n"
import { useAuth } from "@/hooks/useAuth"

export function MobileNav({ isLocked = false }: { isLocked?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { t, language } = useTranslation()
  const { user, profile, signOut } = useAuth()
  const candidateName = profile?.full_name || user?.user_metadata?.full_name || user?.email

  const navItems = [
    { href: "/dashboard", label: t('navDashboard') },
    { href: "/practice", label: t('navPractice') },
    { href: "/exam", label: t('navExams') },
    { href: "/results", label: t('navResults') },
    { href: "/settings", label: t('navSettings') },
  ]

  const handleSignOut = async () => {
    if (isLocked) return
    setOpen(false)
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger 
        render={
          <button
            type="button"
            aria-label="Open Navigation Menu"
            className="md:hidden size-9 inline-flex items-center justify-center rounded-[2px] border border-white/20 bg-black text-white shadow-none hover:bg-white/10 hover:border-white/40 transition-all duration-120 ease-out motion-safe:active:scale-95 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffed00] focus-visible:ring-offset-2 focus-visible:ring-offset-black cursor-pointer"
          />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px] rounded-none border-r border-neutral-300 dark:border-white/20">
        <SheetHeader>
          <SheetTitle className="text-left font-heading font-bold text-2xl tracking-tight">EXAMSARTHI</SheetTitle>
          <SheetDescription className="text-left sr-only">
            Navigation menu
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Mobile navigation" className="flex flex-col gap-2 mt-8">
          {isLocked ? (
            <div className="p-4 rounded-none bg-red-950/40 border border-red-500/40 text-red-300 text-sm space-y-2">
              <p className="font-bold flex items-center gap-2 text-red-400">
                <span>🔒</span>
                <span>{language === 'hi' ? 'सक्रिय परीक्षा सत्र' : 'Active Examination Session'}</span>
              </p>
              <p className="text-xs text-red-200/80 leading-relaxed">
                {language === 'hi'
                  ? 'सुरक्षा नियमों के अनुसार सक्रिय परीक्षा के दौरान नेविगेशन लॉक है। बाहर जाने के लिए कृपया पहले परीक्षा सबमिट करें।'
                  : 'Navigation outside the active examination is strictly locked. Please submit your exam before exiting.'}
              </p>
            </div>
          ) : (
            navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`text-base font-bold tracking-[0.144px] px-3 py-2.5 rounded-[2px] transition-colors ${
                  pathname === item.href 
                    ? "bg-surface-soft dark:bg-surface-deep text-foreground border-l-2 border-primary" 
                    : "text-neutral-700 dark:text-neutral-300 hover:text-foreground hover:bg-surface-soft"
                }`}
              >
                {item.label}
              </Link>
            ))
          )}

          <div className="border-t border-hairline dark:border-white/16 pt-6 mt-4">
            {user ? (
              <div className="space-y-3">
                <p className="text-xs text-neutral-500 truncate px-2">
                  Candidate: <strong className="text-foreground">{candidateName}</strong>
                </p>
                <p className="text-[11px] text-neutral-400 truncate px-2 -mt-1">
                  {user.email}
                </p>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="w-full justify-start gap-2 h-12 text-sm font-bold rounded-[2px]"
                >
                  <LogOut className="size-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button className="w-full justify-start gap-2 h-12 text-sm font-bold rounded-[2px]">
                  <LogIn className="size-4" />
                  Log In / Sign Up
                </Button>
              </Link>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
