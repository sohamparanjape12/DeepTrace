'use client';

import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MarqueeProps {
  children: React.ReactNode;
  direction?: 'left' | 'right';
  speed?: number;
  className?: string;
  repeat?: number;
}

export function Marquee({ 
  children, 
  direction = 'left', 
  speed = 40,
  className,
  repeat = 4
}: MarqueeProps) {
  return (
    <div className={cn('flex overflow-hidden select-none gap-x-12', className)}>
      <motion.div
        animate={{
          x: direction === 'left' ? ['0%', '-50%'] : ['-50%', '0%'],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: 'linear',
        }}
        className="flex shrink-0 items-center justify-around gap-x-12 min-w-full"
      >
        {Array.from({ length: repeat }).map((_, i) => (
          <div key={i} className="flex shrink-0 items-center gap-x-12">
            {children}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
