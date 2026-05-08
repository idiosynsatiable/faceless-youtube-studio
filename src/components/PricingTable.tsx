interface Tier {
  name: string;
  price: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const TIERS: Tier[] = [
  {
    name: 'Free',
    price: '$0',
    features: [
      '5 video ideas / month',
      '1 channel profile',
      'Basic trend scoring',
      'Markdown export'
    ],
    cta: 'Start free'
  },
  {
    name: 'Creator',
    price: '$19 / month',
    features: [
      '100 video ideas / month',
      '20 full video packages / month',
      'Metadata optimizer',
      'Compliance checklist',
      'JSON export'
    ],
    cta: 'Upgrade'
  },
  {
    name: 'Studio',
    price: '$49 / month',
    features: [
      '500 video ideas / month',
      '100 full video packages / month',
      'Launch calendar',
      'Analytics feedback',
      'YouTube upload preparation',
      'Monetization planner'
    ],
    cta: 'Upgrade',
    highlighted: true
  },
  {
    name: 'Agency',
    price: '$149 / month',
    features: [
      'Unlimited normal packages',
      'Multi-channel management',
      'White-label exports',
      'Client-ready reports',
      'Batch generation',
      'Priority queue'
    ],
    cta: 'Upgrade'
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    features: [
      'Team workspace',
      'Custom compliance packs',
      'Private deployment',
      'API access'
    ],
    cta: 'Contact sales'
  }
];

export default function PricingTable() {
  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
      {TIERS.map((tier) => (
        <div
          key={tier.name}
          className={`card flex flex-col gap-4 ${tier.highlighted ? 'border-signal-500 shadow-[0_0_0_1px_rgba(94,234,212,0.4)]' : ''}`}
        >
          <div>
            <h3 className="text-lg font-semibold">{tier.name}</h3>
            <p className="mt-1 text-2xl font-semibold text-ink-50">{tier.price}</p>
          </div>
          <ul className="space-y-2 text-sm text-ink-200">
            {tier.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-signal-500">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <button className="btn-secondary mt-auto">{tier.cta}</button>
        </div>
      ))}
    </div>
  );
}
