import LandingHero from '@/components/LandingHero';
import AppShell from '@/components/AppShell';
import PricingTable from '@/components/PricingTable';

const MODULES = [
  { name: 'Trend Radar', body: 'Identify rising US and international topics with monetization, competition, and advertiser-safety signals.' },
  { name: 'Demographic Engine', body: 'Map every topic to the audience segment that converts — without fake personas.' },
  { name: 'Niche Scorer', body: 'Score channel niches with a transparent formula you can defend.' },
  { name: 'Idea Engine', body: 'Generate full-package faceless video ideas with hooks, formats, and disclaimer needs.' },
  { name: 'Hook & Retention', body: 'Engineer ethical retention with promise + payoff, not bait.' },
  { name: 'Script Engine', body: 'Voiceover-ready scripts with sources-needed and fact-check checklists.' },
  { name: 'Storyboard Engine', body: 'Scene-by-scene faceless plans with asset license requirements.' },
  { name: 'Video Assembler', body: 'Documented FFmpeg pipeline. Sanitized inputs. No shell injection.' },
  { name: 'Caption Engine', body: 'SRT-ready captions, lower-thirds, and chapters in one pass.' },
  { name: 'Metadata Engine', body: 'Truthful titles, description, tags, hashtags, pinned comment, disclaimers.' },
  { name: 'Compliance Engine', body: 'Auto-triggers financial, medical, legal, AI, and affiliate disclaimers.' },
  { name: 'Monetization Engine', body: 'Revenue plan, affiliate plan, sponsor plan, product ladder, first-10 lists.' },
  { name: 'Upload Workflow', body: 'OAuth-gated upload prep. Publish only after explicit user authorization.' },
  { name: 'Analytics Feedback', body: 'Reads only real data you provide or that the API returns. No fabrication.' },
  { name: 'Subscriber Growth', body: 'Organic strategies only. No bots, no pods, no buying.' }
];

export default function HomePage() {
  return (
    <AppShell>
      <LandingHero />

      <section className="card">
        <h2 className="text-xl font-semibold">The problem</h2>
        <p className="mt-2 text-sm text-ink-200">
          Creators waste time guessing niches, chasing random trends, editing manually, and uploading without a monetization system. Faceless YouTube Studio replaces the guesswork with a documented, ethical workflow.
        </p>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold">Workflow</h2>
        <ol className="mt-3 grid gap-2 text-sm text-ink-200 md:grid-cols-2">
          <li>1. Trend discovery</li>
          <li>2. Demographic scoring</li>
          <li>3. Idea queue</li>
          <li>4. Script</li>
          <li>5. Storyboard</li>
          <li>6. Video plan</li>
          <li>7. Metadata</li>
          <li>8. Compliance</li>
          <li>9. Upload package</li>
          <li>10. Analytics feedback</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Core modules</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {MODULES.map((m) => (
            <div key={m.name} className="card">
              <h3 className="text-base font-semibold">{m.name}</h3>
              <p className="mt-2 text-sm text-ink-200">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold">Monetization engine</h2>
        <p className="mt-2 text-sm text-ink-200">YouTube Partner readiness, affiliate plan, sponsor plan, digital products, lead magnets, paid newsletter, memberships, courses, consulting funnel, and licensing — with FTC-aligned disclosures and no fake engagement.</p>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold">Compliance engine</h2>
        <p className="mt-2 text-sm text-ink-200">Triggers financial, medical, legal, AI, affiliate, sponsor, copyright, platform-policy, data-accuracy, and no-guaranteed-results disclaimers. Refuses misleading or harmful claims at the source.</p>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold">YouTube-safe growth</h2>
        <p className="mt-2 text-sm text-ink-200">Series design, hooks, packaging, end-screen routes, Shorts-to-long-form funnel, newsletter capture, real collaboration, retention-driven editing, and analytics-driven iteration. Never bots, pods, or fake engagement.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Pricing</h2>
        <div className="mt-4">
          <PricingTable />
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold">FAQ</h2>
        <dl className="mt-3 space-y-3 text-sm text-ink-200">
          <div>
            <dt className="font-semibold text-ink-50">Do you guarantee growth?</dt>
            <dd>No. Results depend on effort, niche, market timing, and execution. The product gives you a defensible system; outcomes are yours.</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink-50">Does the product upload videos automatically?</dt>
            <dd>Only after explicit, per-video user authorization through the YouTube OAuth integration. Publish requires a confirmed click.</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink-50">Do you use bots, pods, or fake metrics?</dt>
            <dd>Never. The product refuses any tactic that violates YouTube terms or FTC guidance.</dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold">Ready to build?</h2>
        <p className="mt-2 text-sm text-ink-200">Open the dashboard to start a real workflow with your niche, audience, and topic.</p>
      </section>
    </AppShell>
  );
}
