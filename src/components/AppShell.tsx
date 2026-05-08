import Link from 'next/link';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/trend-radar', label: 'Trend Radar' },
  { href: '/niches', label: 'Niches' },
  { href: '/demographics', label: 'Demographics' },
  { href: '/ideas', label: 'Ideas' },
  { href: '/scripts', label: 'Scripts' },
  { href: '/studio', label: 'Studio' },
  { href: '/videos', label: 'Videos' },
  { href: '/shorts', label: 'Shorts' },
  { href: '/shorts/from-longform', label: 'Shorts ↪ Long' },
  { href: '/shorts/calendar', label: 'Shorts cal.' },
  { href: '/shorts/analytics', label: 'Shorts an.' },
  { href: '/uploads', label: 'Uploads' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/monetization', label: 'Monetization' },
  { href: '/compliance', label: 'Compliance' },
  { href: '/settings', label: 'Settings' },
  { href: '/pricing', label: 'Pricing' }
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-4 border-b border-ink-800 pb-6 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight text-ink-50">
          Faceless<span className="text-signal-500">YouTube</span>Studio
        </Link>
        <nav className="flex flex-wrap gap-2 text-xs">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="tag hover:border-signal-500">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex flex-col gap-8 pb-12">{children}</main>
      <footer className="border-t border-ink-800 pt-6 text-xs text-ink-300">
        Faceless YouTube Studio is a creator command center. We never use fake engagement, bot subscribers, fake likes, fake views, comment spam, or stolen content. All disclaimers and disclosures follow FTC and YouTube guidance.
      </footer>
    </div>
  );
}
