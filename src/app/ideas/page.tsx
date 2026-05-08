import AppShell from '@/components/AppShell';
import IdeaQueue from '@/components/IdeaQueue';

export default function IdeasPage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Ideas</h1>
      <p className="text-sm text-ink-300">Generate faceless video ideas with hook, format, monetization angle, retention strategy, and disclaimer needs.</p>
      <IdeaQueue />
    </AppShell>
  );
}
