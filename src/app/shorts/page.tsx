import AppShell from '@/components/AppShell';
import ShortsIdeaQueue from '@/components/ShortsIdeaQueue';
import ShortsFunnelCard from '@/components/ShortsFunnelCard';

export default function ShortsPage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Shorts</h1>
      <p className="text-sm text-ink-300">Generate, plan, and connect Shorts to long-form videos. Quality-first cadence. No bots, no fake engagement, no spam.</p>
      <ShortsIdeaQueue />
      <ShortsFunnelCard />
    </AppShell>
  );
}
