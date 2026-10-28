'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabase } from '@/lib/supabase-client';
import {
  FeedIcon, ArchiveIcon, UserIcon, ShieldIcon, MenuIcon,
} from '@/app/_components/icons';

import BrandMark from '@/app/_components/BrandMark';
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || '';

type NavItem = { href: string; label: string; exact: boolean; Icon: (p: { size?: number }) => JSX.Element };

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Feed', exact: true, Icon: FeedIcon },
  { href: '/dashboard/archive', label: 'Archive', exact: false, Icon: ArchiveIcon },
  { href: '/dashboard/profile', label: 'Profile & Billing', exact: false, Icon: UserIcon },
];

const TIER_STYLE: Record<string, string> = {
  enterprise: 'bg-accent text-[#1a2744]',
  pro: 'bg-accent text-[#1a2744]',
  basic: 'bg-white/10 text-rail-ink',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();

    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_tier, email')
        .eq('id', user.id)
        .single();

      // Allow 'active' and 'trialing'; block everything else
      if (!profile || !['active', 'trialing'].includes(profile.subscription_status)) {
        router.replace('/');
        return;
      }

      setEmail(profile.email || user.email || null);
      setTier(profile.subscription_tier || 'basic');
      setIsAdmin(user.email === ADMIN_EMAIL);
      setChecking(false);
    }

    checkAuth();
  }, [router]);

  async function handleSignOut() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    window.location.href = process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://conform-edge.com';
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-line-strong border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted text-sm">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  const nav = isAdmin
    ? [...NAV, { href: '/admin', label: 'Admin', exact: false, Icon: ShieldIcon } as NavItem]
    : NAV;

  const initials = (email || 'U').slice(0, 2).toUpperCase();

  function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <>
        {nav.map(({ href, label, exact, Icon }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors ${
                active ? 'bg-white/10 text-white' : 'text-rail-ink hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-canvas md:flex">
      {/* Desktop rail */}
      <aside className="hidden md:flex md:flex-col md:w-[232px] md:shrink-0 md:sticky md:top-0 md:h-screen bg-rail px-3.5 py-4 gap-6">
        <div className="flex items-center gap-2.5 px-1.5 py-1">
          <BrandMark size={30} />
          <div className="leading-tight">
            <div className="text-white font-bold text-sm">RegIntel™</div>
            <div className="text-rail-dim text-[11px] font-medium">Conform-Edge</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          <NavLinks />
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          {tier && (
            <span className={`self-start text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${TIER_STYLE[tier] || TIER_STYLE.basic}`}>
              {tier}
            </span>
          )}
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5">
            <div className="w-[30px] h-[30px] rounded-full bg-steel text-white grid place-items-center text-[12px] font-bold shrink-0">{initials}</div>
            <div className="min-w-0">
              <div className="text-rail-dim text-[11px] truncate">{email}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-[12.5px] text-rail-dim hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 rounded-lg text-left transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-50 bg-rail">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <BrandMark size={28} />
            <span className="text-white font-bold text-sm">RegIntel™</span>
          </div>
          <div className="flex items-center gap-2">
            {tier && (
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${TIER_STYLE[tier] || TIER_STYLE.basic}`}>{tier}</span>
            )}
            <button onClick={() => setMenuOpen(v => !v)} aria-label="Toggle menu" className="text-rail-ink hover:text-white p-1">
              <MenuIcon size={20} />
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-white/10 px-3 py-3 flex flex-col gap-1">
            <NavLinks onNavigate={() => setMenuOpen(false)} />
            <button onClick={handleSignOut} className="text-[13.5px] text-rail-dim hover:text-white px-3 py-2.5 rounded-lg text-left">
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Page content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line px-6 py-3 text-xs text-faint flex items-center justify-between bg-surface">
          <span>Conform-Edge RegIntel™ · Updated weekdays ~6 AM MT</span>
          <Link href="/" className="hover:text-ink transition-colors">Back to site</Link>
        </footer>
      </div>
    </div>
  );
}
