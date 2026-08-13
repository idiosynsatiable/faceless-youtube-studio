import Link from 'next/link';
import LandingHero from '@/components/LandingHero';
import AppShell from '@/components/AppShell';
import PricingTable from '@/components/PricingTable';

const MODULES = [
  { name: 'Trend Radar', body: 'Identify rising US and international topics with monetization, competition, and advertiser-safety signals.', mark: 'I' },
  { name: 'Demographic Engine', body: 'Map every topic to the audience segment that converts—without fabricated personas.', mark: 'II' },
  { name: 'Niche Scorer', body: 'Score channel niches with a transparent formula you can defend.', mark: 'III' },
  { name: 'Idea Engine', body: 'Generate faceless video ideas with hooks, formats, and disclosure needs.', mark: 'IV' },
  { name: 'Hook & Retention', body: 'Engineer ethical retention with promise and payoff, not bait.', mark: 'V' },
  { name: 'Script Engine', body: 'Prepare voiceover-ready scripts with sources-needed and fact-check checklists.', mark: 'VI' },
  { name: 'Storyboard Engine', body: 'Move from concept to a scene-by-scene plan with asset-license requirements.', mark: 'VII' },
  { name: 'Video Assembler', body: 'Run a documented FFmpeg pipeline with sanitized, operator-owned inputs.', mark: 'VIII' },
  { name: 'Caption Engine', body: 'Keep captions, lower-thirds, and chapters coherent in one disciplined pass.', mark: 'IX' },
  { name: 'Metadata Engine', body: 'Create truthful packaging: titles, descriptions, tags, chapters, and disclosures.', mark: 'X' },
  { name: 'Compliance Engine', body: 'Surface the right financial, medical, legal, AI, and affiliate disclosures.', mark: 'XI' },
  { name: 'Monetization Engine', body: 'Build defensible revenue pathways, sponsors, offers, and affiliate plans.', mark: 'XII' },
  { name: 'Release Workflow', body: 'Prepare OAuth-gated uploads that always require your explicit authorization.', mark: 'XIII' },
  { name: 'Analytics Feedback', body: 'Read genuine data and turn it into next-step creative decisions.', mark: 'XIV' },
  { name: 'Sustainable Growth', body: 'Build audience through series, packaging, and collaboration—not artificial engagement.', mark: 'XV' }
];

const WORKFLOW = ['Discover signals', 'Choose the audience', 'Shape the angle', 'Write the narrative', 'Build the visual plan', 'Render & release'];

export default function HomePage() {
  return (
    <AppShell>
      <LandingHero />

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="card lg:col-span-2">
          <p className="eyebrow">A better operating model</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-ink-50">Make the channel feel inevitable.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-200">Creators lose time to vague niches, random trend-chasing, manual handoffs, and uploads without a commercial point of view. Faceless Studio turns those moving parts into one considered, accountable operating system.</p>
        </article>
        <article className="card border-signal-500/30 bg-signal-400/10">
          <p className="eyebrow">House standard</p>
          <p className="mt-3 font-display text-3xl font-bold text-ink-50">Ethical by design.</p>
          <p className="mt-2 text-sm leading-6 text-ink-200">No fake engagement, borrowed credentials, stolen media, or untraceable claims.</p>
        </article>
      </section>

      <section className="card overflow-visible">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">The atelier workflow</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-ink-50">From market movement to a finished release.</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-ink-300">Every stage has a purpose, a handoff, and a governance check—so attention never outruns judgment.</p>
        </div>
        <ol className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {WORKFLOW.map((step, index) => (
            <li key={step} className="group flex items-center gap-4 rounded-xl border border-accent-500/20 bg-white/65 p-4 transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-vellum">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-accent-500/55 bg-porcelain-100 font-display text-lg font-bold text-accent-600">{String(index + 1).padStart(2, '0')}</span>
              <span className="font-semibold text-ink-100">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">The complete cabinet</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-ink-50">A complete, governed creative stack.</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-ink-300">Fifteen specialized instruments, connected by a single creator-led workflow.</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((module) => (
            <article key={module.name} className="card group transition duration-200 hover:-translate-y-1 hover:border-accent-500/55 hover:shadow-gilt">
              <div className="flex items-start justify-between gap-4">
                <span className="font-display text-2xl font-bold text-accent-500/75">{module.mark}</span>
                <span className="h-2 w-2 rounded-full bg-signal-500/75 transition group-hover:scale-125" />
              </div>
              <h3 className="mt-6 text-base font-bold text-ink-50">{module.name}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-200">{module.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="card-dark p-7 sm:p-8">
          <p className="eyebrow !text-accent-400">Commercial architecture</p>
          <h2 className="mt-3 font-display text-3xl font-bold">Create a channel that has somewhere to go.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-porcelain-100">Turn audience attention into a responsible commercial system: partner readiness, aligned affiliates, sponsor outreach, lead magnets, memberships, products, and a coherent offer ladder.</p>
          <Link href="/monetization" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-accent-400 transition hover:text-porcelain-50">Enter the revenue bureau <span aria-hidden>→</span></Link>
        </article>
        <article className="card">
          <p className="eyebrow">Governance, visible</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-ink-50">Trust is part of the craft.</h2>
          <p className="mt-3 text-sm leading-6 text-ink-200">Compliance guidance is not an afterthought. The studio flags financial, medical, legal, AI, affiliate, sponsor, copyright, platform-policy, and data-accuracy risks as the work develops.</p>
          <Link href="/compliance" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-signal-600 transition hover:text-signal-500">Open the compliance ledger <span aria-hidden>→</span></Link>
        </article>
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Memberships</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-ink-50">Choose the level of stewardship.</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-ink-300">Start with a focused practice, then expand into a full studio operation when the system earns it.</p>
        </div>
        <PricingTable />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="card lg:col-span-2">
          <p className="eyebrow">Questions of practice</p>
          <dl className="mt-5 grid gap-5 md:grid-cols-3">
            <div>
              <dt className="font-bold text-ink-50">Do you guarantee growth?</dt>
              <dd className="mt-2 text-sm leading-6 text-ink-200">No. Results come from market timing, execution, and sustained judgment. The studio gives you a more defensible system.</dd>
            </div>
            <div>
              <dt className="font-bold text-ink-50">Will it publish by itself?</dt>
              <dd className="mt-2 text-sm leading-6 text-ink-200">Never. YouTube release requires explicit, per-video authorization through a connected account.</dd>
            </div>
            <div>
              <dt className="font-bold text-ink-50">Does it manufacture attention?</dt>
              <dd className="mt-2 text-sm leading-6 text-ink-200">Never. The system refuses bots, pods, fake metrics, and other tactics that weaken trust.</dd>
            </div>
          </dl>
        </article>
        <aside className="card border-accent-500/45 bg-porcelain-100">
          <p className="eyebrow">Ready when you are</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-ink-50">Start with one clear signal.</h2>
          <p className="mt-3 text-sm leading-6 text-ink-200">Open the dashboard, bring your niche and audience, then let the work become specific.</p>
          <Link href="/dashboard" className="btn-primary mt-6 w-full">Begin the brief <span aria-hidden>→</span></Link>
        </aside>
      </section>
    </AppShell>
  );
}
