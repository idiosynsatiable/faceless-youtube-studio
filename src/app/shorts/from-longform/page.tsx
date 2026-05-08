import AppShell from '@/components/AppShell';
import ShortsFromLongformPanel from '@/components/ShortsFromLongformPanel';

export default function ShortsFromLongformPage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Shorts from long-form</h1>
      <p className="text-sm text-ink-300">Extract clip-worthy moments and generate 15s, 30s, and 60s variants tied back to the long-form anchor.</p>
      <ShortsFromLongformPanel />
    </AppShell>
  );
}
