import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Faceless Studio — Creator Command Center',
  description:
    'A refined creator command center for turning market intelligence into compliant, monetizable faceless YouTube video systems.',
  manifest: '/manifest.webmanifest'
};

export const viewport: Viewport = {
  themeColor: '#fffdf7',
  colorScheme: 'light'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
