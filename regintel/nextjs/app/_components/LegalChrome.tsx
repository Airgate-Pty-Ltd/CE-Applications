// Shared chrome for the public legal pages (/terms, /privacy).
//
// Lives in a private folder (leading underscore) so it is not treated as a
// route. These are the only public, ungated pages RegIntel serves besides the
// /enter redirect; they carry no marketing or pricing copy — that lives on the
// Conform-Edge website — only the legal notices a relying-party app still needs
// to publish.

import Link from 'next/link';
import { ExternalIcon } from './icons';

import BrandMark from './BrandMark';
const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://conform-edge.com';

export default function LegalChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <header className="bg-rail text-white px-6 py-3 flex items-center justify-between">
        <a href={WEBSITE_URL} className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <BrandMark size={32} />
          <span className="font-semibold text-[15px] tracking-tight">Conform-Edge RegIntel™</span>
        </a>
        <a href={WEBSITE_URL} className="flex items-center gap-1.5 text-rail-ink hover:text-white text-sm transition-colors">
          Conform-Edge <ExternalIcon size={14} />
        </a>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-12">
        <article>{children}</article>

        <nav className="mt-14 pt-6 border-t border-line text-sm text-muted flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/terms" className="hover:text-ink transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link>
          <a href={WEBSITE_URL} className="hover:text-ink transition-colors">Conform-Edge website</a>
        </nav>
      </main>
    </div>
  );
}
