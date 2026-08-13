'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavigationItem = { href: string; label: string; mark: string };
type NavigationGroup = { label: string; items: NavigationItem[] };

const NAVIGATION: NavigationGroup[] = [
  {
    label: 'Command',
    items: [
      { href: '/dashboard', label: 'Dashboard', mark: '01' },
      { href: '/trend-radar', label: 'Trend radar', mark: '02' },
      { href: '/niches', label: 'Niche atelier', mark: '03' },
      { href: '/demographics', label: 'Audience map', mark: '04' }
    ]
  },
  {
    label: 'Production',
    items: [
      { href: '/ideas', label: 'Idea vault', mark: '05' },
      { href: '/scripts', label: 'Script room', mark: '06' },
      { href: '/studio', label: 'Video maker', mark: '07' },
      { href: '/videos', label: 'Export library', mark: '08' },
      { href: '/uploads', label: 'Release desk', mark: '09' }
    ]
  },
  {
    label: 'Growth',
    items: [
      { href: '/shorts', label: 'Shorts studio', mark: '10' },
      { href: '/shorts/from-longform', label: 'Clip atelier', mark: '11' },
      { href: '/shorts/calendar', label: 'Cadence calendar', mark: '12' },
      { href: '/shorts/analytics', label: 'Shorts signals', mark: '13' },
      { href: '/analytics', label: 'Channel intelligence', mark: '14' },
      { href: '/monetization', label: 'Revenue bureau', mark: '15' }
    ]
  },
  {
    label: 'Governance',
    items: [
      { href: '/compliance', label: 'Compliance ledger', mark: '16' },
      { href: '/settings', label: 'House settings', mark: '17' },
      { href: '/pricing', label: 'Memberships', mark: '18' }
    ]
  }
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
}

function NavLink({ item, active }: { item: NavigationItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
        active
          ? 'bg-signal-500 text-porcelain-50 shadow-uranium'
          : 'text-ink-200 hover:bg-porcelain-100 hover:text-ink-50'
      }`}
    >
      <span className="font-semibold">{item.label}</span>
      <span className={`font-mono text-[9px] tracking-wider ${active ? 'text-porcelain-100' : 'text-accent-500 group-hover:text-signal-600'}`}>
        {item.mark}
      </span>
    </Link>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';

  return (
    <div className="app-frame">
      <header className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-accent-500/30 bg-white/75 px-4 py-3 shadow-vellum backdrop-blur md:px-5">
        <Link href="/" className="group flex min-w-0 items-center gap-3" aria-label="Faceless YouTube Studio home">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-accent-500 bg-ink-50 font-display text-lg font-bold text-porcelain-50 shadow-gilt">
            F
            <span className="absolute inset-1 rounded-full border border-accent-400/70" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-bold tracking-tight text-ink-50 sm:text-xl">Faceless Studio</span>
            <span className="hidden text-[9px] font-bold uppercase tracking-[0.2em] text-accent-600 sm:block">The creator&apos;s cabinet</span>
          </span>
        </Link>
        <div className="hidden items-center gap-3 lg:flex">
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-300">System posture</p>
            <p className="mt-0.5 text-xs font-semibold text-signal-600">Ethical growth · Ready</p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-full border border-signal-500/30 bg-signal-400/15 text-sm text-signal-600">✦</span>
        </div>
      </header>

      <div className="grid flex-1 gap-5 lg:grid-cols-[238px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-accent-500/28 bg-white/70 p-3 shadow-vellum backdrop-blur lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <nav aria-label="Studio navigation" className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-5 lg:overflow-visible">
            <Link href="/" className={`hidden lg:flex ${pathname === '/' ? 'bg-porcelain-100 text-accent-600' : 'text-ink-300 hover:text-ink-50'} items-center justify-between rounded-xl px-3 py-2 text-sm font-bold transition`}>
              <span>House overview</span><span className="text-xs">↗</span>
            </Link>
            {NAVIGATION.map((group) => (
              <section key={group.label} className="min-w-max lg:min-w-0">
                <p className="mb-2 hidden px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-accent-600 lg:block">{group.label}</p>
                <div className="flex gap-1 lg:block lg:space-y-1">
                  {group.items.map((item) => <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />)}
                </div>
              </section>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex items-center justify-between gap-4 border-y border-accent-500/25 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-600">Faceless YouTube Studio · Command Center</p>
            <p className="hidden items-center gap-2 text-xs text-ink-300 sm:flex"><span className="h-2 w-2 rounded-full bg-signal-500 shadow-[0_0_0_4px_rgba(98,214,83,0.16)]" /> Systems synchronized</p>
          </div>
          <main className="flex flex-col gap-7 pb-10">{children}</main>
        </div>
      </div>

      <footer className="mt-3 border-t border-accent-500/30 py-5 text-xs leading-5 text-ink-300">
        <span className="font-semibold text-ink-100">Faceless Studio operates with a strict ethical-growth standard.</span> No fabricated engagement, deceptive packaging, or unlicensed media—only informed creative decisions, explicit authorization, and traceable exports.
      </footer>
    </div>
  );
}
