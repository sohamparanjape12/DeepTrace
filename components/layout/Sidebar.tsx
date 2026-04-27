'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { LayoutDashboard, Images, AlertCircle, Settings, Shield, ChevronRight, LogOut, FileText, Bell } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { NotificationBell } from '@/components/notifications/NotificationBell';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assets', label: 'Assets', icon: Images },
  { href: '/violations', label: 'Violations', icon: AlertCircle },
  { href: '/dmca', label: 'DMCA Takedowns', icon: FileText },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

import { ThemeToggle } from './ThemeToggle';
import Image from 'next/image';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-brand-surface border-r border-brand-border flex flex-col z-40">
      {/* Logo + Theme */}
      <div className="px-6 py-7 border-b border-brand-border flex items-start justify-center flex-col gap-2">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-md bg-[#0f0f0f] flex items-center justify-center">
            <Image src="/icon.svg" alt="Logo" width={20} height={20} />
          </div>
          <span className="font-display font-black text-lg tracking-tight text-brand-text" style={{ fontWeight: 900 }}>DeepTrace</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        <p className="text-meta px-3 mb-4">Navigation</p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                isActive
                  ? 'bg-brand-text text-brand-bg shadow-soft'
                  : 'text-brand-muted hover:bg-brand-bg hover:text-brand-text',
              )}
            >
              <Icon className={clsx('w-4 h-4 shrink-0', isActive ? 'text-brand-bg' : 'text-brand-muted group-hover:text-brand-text')} />
              <span className="text-[11px] font-black uppercase tracking-widest flex-1">{label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer: User + Status */}
      <div className="px-4 pb-6 pt-4 border-t border-brand-border space-y-4">

        <div className="flex items-center justify-between gap-2">
          <ThemeToggle />
          <NotificationBell />
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName ?? 'User'} className="w-8 h-8 rounded-full border border-brand-border shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center shrink-0">
                <span className="text-[10px] font-black text-brand-muted">
                  {user.displayName?.slice(0, 2).toUpperCase() ?? 'DT'}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-brand-text truncate">{user.displayName ?? 'User'}</p>
              <p className="text-[9px] text-brand-muted truncate">{user.email}</p>
            </div>
            <button onClick={handleLogout} title="Sign out" className="p-1.5 rounded-lg hover:bg-brand-bg transition-colors shrink-0">
              <LogOut className="w-3.5 h-3.5 text-brand-muted" />
            </button>
          </div>
        ) : (
          <Link href="/login" className="flex items-center gap-3 text-brand-muted hover:text-brand-text transition-colors">
            <div className="w-8 h-8 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center shrink-0">
              <span className="text-[10px] font-black text-brand-muted">DT</span>
            </div>
            <span className="text-[11px] font-bold">Sign In</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
