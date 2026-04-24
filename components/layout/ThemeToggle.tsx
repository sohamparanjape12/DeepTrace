'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-8 h-8" />;

  return (
    <div className="flex items-center gap-1 p-1 bg-brand-bg border border-brand-border rounded-lg">
      {[
        { id: 'light', icon: Sun },
        { id: 'dark', icon: Moon },
        { id: 'system', icon: Monitor },
      ].map(({ id, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setTheme(id as any)}
          className={clsx(
            'p-1.5 rounded-md transition-all duration-200',
            theme === id 
              ? 'bg-brand-surface text-brand-text shadow-soft border border-brand-border' 
              : 'text-brand-muted hover:text-brand-text hover:bg-brand-surface/50'
          )}
          title={`${id.charAt(0).toUpperCase() + id.slice(1)} Mode`}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}
