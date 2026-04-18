'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export function Button({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  ...props 
}: ButtonProps) {
  const variants = {
    primary: 'bg-brand-text text-white border-transparent hover:bg-zinc-800',
    secondary: 'bg-transparent text-brand-text border-brand-border hover:bg-zinc-50',
    ghost: 'bg-transparent text-brand-text border-transparent hover:bg-zinc-50',
  };

  const sizes = {
    sm: 'px-4 py-1.5 text-xs h-8',
    md: 'px-6 py-2.5 text-sm h-10',
    lg: 'px-10 py-4 text-base h-14',
    icon: 'p-2 w-10 h-10',
  };

  const innerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={cn(
        'relative inline-flex items-center justify-center border font-medium transition-all active:duration-75',
        'rounded-md', // Minimal non-pill radius
        variants[variant],
        sizes[size],
        className
      )}
      {...props as any}
    />
  );
}
