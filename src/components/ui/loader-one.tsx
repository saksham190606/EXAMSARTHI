'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';

interface LoaderOneProps {
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoaderOne: React.FC<LoaderOneProps> = ({
  label = 'Loading content...',
  className = '',
  size = 'md',
}) => {
  const storeReducedMotion = useAccessibilityStore((state) => state.reducedMotion);
  const systemReducedMotion = useReducedMotion();
  const isReducedMotion = storeReducedMotion || systemReducedMotion;

  const dotSizes = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const dotClass = dotSizes[size] || dotSizes.md;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <div className="flex items-center justify-center gap-2">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className={`${dotClass} rounded-full bg-[#ffed00] dark:bg-[#ffed00] border border-black/30 dark:border-white/20 shadow-xs`}
            initial={{ x: 0 }}
            animate={
              isReducedMotion
                ? { opacity: [0.35, 1, 0.35] }
                : {
                    x: [0, 8, 0],
                    opacity: [0.35, 1, 0.35],
                    scale: [1, 1.25, 1],
                  }
            }
            transition={{
              duration: 0.9,
              repeat: Infinity,
              delay: i * 0.18,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      <span className="sr-only">{label}</span>
      <p className="text-xs font-bold tracking-wider uppercase text-neutral-800 dark:text-[rgba(255,255,255,0.75)] font-mono">
        {label}
      </p>
    </div>
  );
};

export default LoaderOne;
