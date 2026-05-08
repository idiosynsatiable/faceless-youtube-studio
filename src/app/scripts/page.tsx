import AppShell from '@/components/AppShell';
import ScriptEditor from '@/components/ScriptEditor';
import RetentionCurvePanel from '@/components/RetentionCurvePanel';

export default function ScriptsPage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Scripts</h1>
      <p className="text-sm text-ink-300">Voiceover-ready faceless scripts with transitions, retention beats, visual directions, and disclaimer placements.</p>
      <ScriptEditor />
      <RetentionCurvePanel />
    </AppShell>
  );
}
