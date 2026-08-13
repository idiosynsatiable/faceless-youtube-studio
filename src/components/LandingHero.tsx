import Link from 'next/link';

const PROOF_POINTS = [
  { value: '18', label: 'governed modules' },
  { value: '01', label: 'ethical system' },
  { value: '∞', label: 'creative angles' }
];

export default function LandingHero() {
  return (
    <section className="card-dark p-7 sm:p-10 lg:p-12">
      <div className="grid gap-9 lg:grid-cols-[minmax(0,1.2fr)_300px] lg:items-end">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-accent-400/50 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-accent-400">
            <span className="text-signal-400">✦</span> Creator intelligence, refined
          </p>
          <h1 className="mt-6 max-w-4xl font-display text-5xl font-bold leading-[0.96] tracking-tight sm:text-6xl lg:text-7xl">
            Build a channel with <span className="text-accent-400">taste, signal,</span> and a system behind it.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-porcelain-100 sm:text-lg">
            A private creative command center for turning market movement into distinguished faceless video packages—without the noise, guesswork, or unethical shortcuts.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn-primary">Enter the command center <span aria-hidden>→</span></Link>
            <Link href="/studio" className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent-400/60 bg-white/5 px-5 py-3 text-sm font-bold text-accent-400 transition hover:-translate-y-0.5 hover:bg-white/10">Open video maker <span aria-hidden>↗</span></Link>
          </div>
        </div>

        <aside className="rounded-2xl border border-accent-400/45 bg-[#0b2514]/45 p-5 backdrop-blur">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-400">The cabinet, at a glance</p>
          <div className="mt-5 grid gap-3">
            {PROOF_POINTS.map((point) => (
              <div key={point.label} className="flex items-end justify-between border-b border-white/10 pb-3 last:border-0 last:pb-0">
                <span className="font-display text-3xl font-bold text-porcelain-50">{point.value}</span>
                <span className="max-w-[120px] text-right text-xs leading-4 text-porcelain-100">{point.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-signal-400/35 bg-signal-400/10 p-3 text-xs leading-5 text-porcelain-100">
            <span className="mr-2 text-signal-400">●</span> Built for original thinking, real audience data, and explicit release control.
          </div>
        </aside>
      </div>
    </section>
  );
}
