import AppShell from '@/components/AppShell';
import { config } from '@/lib/config';

export default function SettingsPage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Settings</h1>
      <div className="card space-y-3">
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="text-sm">YouTube OAuth: <span className={config.youtube.enabled ? 'text-signal-500' : 'text-ink-300'}>{config.youtube.enabled ? 'configured' : 'disabled-safe mode'}</span></p>
        <p className="text-sm">Stripe billing: <span className={config.stripe.enabled ? 'text-signal-500' : 'text-ink-300'}>{config.stripe.enabled ? 'configured' : 'disabled-safe mode'}</span></p>
        <p className="text-sm">AI provider: <span className={config.ai.enabled ? 'text-signal-500' : 'text-ink-300'}>{config.ai.enabled ? `provider ${config.ai.provider}` : 'rule-based engines only'}</span></p>
      </div>
      <div className="card space-y-2">
        <h2 className="text-lg font-semibold">Brand voice</h2>
        <p className="text-xs text-ink-300">Configured per channel. Defaults to documentary tone with calm, sourced narration.</p>
      </div>
      <div className="card space-y-2">
        <h2 className="text-lg font-semibold">Region & language</h2>
        <p className="text-xs text-ink-300">Defaults to US English. Override per channel for international audiences.</p>
      </div>
    </AppShell>
  );
}
