import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Faceless YouTube Studio',
  description:
    'Turn rising trends into monetizable faceless video systems. Market intelligence, faceless video production, compliance, upload preparation, and monetization for YouTube creators.',
  manifest: '/manifest.webmanifest',
  themeColor: '#080a18'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
