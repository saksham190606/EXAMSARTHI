'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/lib/store/accessibility';

interface NavItem {
  id: string;
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { id: 'practice', label: 'Practice', href: '/practice' },
  { id: 'exams', label: 'Exams', href: '/exam' },
  { id: 'results', label: 'Results', href: '/results' },
  { id: 'settings', label: 'Settings', href: '/settings' },
];

const HINDI_NAV_LABELS: Record<string, string> = {
  dashboard: 'डैशबोर्ड',
  practice: 'अभ्यास',
  exams: 'परीक्षा',
  results: 'परिणाम',
  settings: 'सेटिंग्स',
};

export function NavigationTabs({ className }: { className?: string }) {
  const pathname = usePathname();
  const reducedMotion = useAccessibilityStore((state) => state.reducedMotion);
  const language = useAccessibilityStore((state) => state.language);

  // Check active state, treating root '/' as Dashboard
  const isItemActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/' || pathname === '/dashboard' || pathname.startsWith('/dashboard');
    }
    return pathname === href || pathname.startsWith(href);
  };

  return (
    <nav aria-label="Main Navigation" className={cn('flex items-center space-x-6', className)}>
      {NAV_ITEMS.map((item) => {
        const active = isItemActive(item.href);
        const displayLabel = language === 'hi' ? (HINDI_NAV_LABELS[item.id] || item.label) : item.label;

        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffed00] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-[2px]"
          >
            <motion.div
              whileTap={reducedMotion ? undefined : { scale: 0.95 }}
              whileHover={reducedMotion ? undefined : (!active ? { scale: 1.05 } : undefined)}
              transition={{
                type: 'spring',
                bounce: 0.2,
                damping: 7,
                duration: 0.4,
              }}
              className={cn(
                'relative px-2 py-1.5 cursor-pointer transition-colors flex items-center',
                active
                  ? 'text-white font-bold tracking-normal'
                  : 'text-white/70 hover:text-white font-medium tracking-[0.01em]'
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span>{displayLabel}</span>

              {active && (
                <motion.span
                  layoutId={reducedMotion ? undefined : 'navbar-active-bubble'}
                  className="absolute bottom-0 left-0 right-0 w-full h-[3px] bg-[#ffed00] rounded-full z-10"
                  transition={{
                    type: 'spring',
                    bounce: 0.19,
                    duration: 0.4,
                  }}
                  aria-hidden="true"
                />
              )}
            </motion.div>
          </Link>
        );
      })}
    </nav>
  );
}

export { NavigationTabs as Navbar };
export default NavigationTabs;
