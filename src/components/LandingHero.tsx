import Link from 'next/link';

export default function LandingHero() {
  return (
    <section className="rounded-3xl border border-ink-800 bg-gradient-to-br from-ink-900 via-ink-900 to-ink-950 p-10 md:p-16">
      <p className="mb-4 inline-flex rounded-full border border-signal-500/40 bg-signal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-signal-400">
        AI-assisted creator command center
      </p>
      <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
        Turn rising trends into <span className="text-signal-500">monetizable faceless</span> video systems.
      </h1>
      <p className="mt-6 max-w-3xl text-lg text-ink-200">
        Discover what audiences care about, generate faceless video packages, optimize for retention, prepare YouTube uploads, and build monetization funnels from one creator command center.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/dashboard" className="btn-primary">Start Building Videos</Link>
        <Link href="/studio" className="btn-secondary">View Demo Workflow</Link>
      </div>
    </section>
  );
}
