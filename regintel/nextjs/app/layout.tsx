import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Conform-Edge RegIntel™ — Regulatory Intelligence for Aviation & Quality',
  description:
    'Daily-updated regulatory intelligence covering FAA, EASA, IAQG, ISO, UK CAA, CAAC, FDA and more. Built for MRO, PAH, AS9100 manufacturers, and QMS consultants.',
  openGraph: {
    title: 'Conform-Edge RegIntel™',
    description: 'Never miss a regulatory change that costs you an audit finding.',
    url: 'https://regintel.conform-edge.com',
    siteName: 'Conform-Edge RegIntel™',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-canvas text-ink">{children}</body>
    </html>
  );
}
