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

export function MobileNav() {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation()
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
    setOpen(false)
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Open Navigation Menu" />}>
        <Menu className="h-6 w-6" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="text-left font-bold text-xl">EXAMSARTHI</SheetTitle>
          <SheetDescription className="text-left sr-only">
            Navigation menu
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Mobile navigation" className="flex flex-col gap-4 mt-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`text-lg font-medium p-2 rounded-md hover:bg-accent hover:text-accent-foreground ${
                pathname === item.href ? "bg-accent text-accent-foreground" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}

          <div className="border-t border-border/50 pt-4 mt-2">
            {user ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground truncate px-2">
                  Candidate: <strong className="text-foreground">{candidateName}</strong>
                </p>
                <p className="text-[11px] text-muted-foreground/80 truncate px-2 -mt-1">
                  {user.email}
                </p>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="w-full justify-start gap-2 h-11 text-base font-medium"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button className="w-full justify-start gap-2 h-11 text-base font-medium">
                  <LogIn className="h-5 w-5" />
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
