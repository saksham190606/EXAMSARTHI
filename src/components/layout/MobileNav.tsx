"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"

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

export function MobileNav() {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()
  const { t } = useTranslation()

  const navItems = [
    { href: "/dashboard", label: t('navDashboard') },
    { href: "/practice", label: t('navPractice') },
    { href: "/exam", label: t('navExams') },
    { href: "/results", label: t('navResults') },
    { href: "/settings", label: t('navSettings') },
  ]

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
        </nav>
      </SheetContent>
    </Sheet>
  )
}
