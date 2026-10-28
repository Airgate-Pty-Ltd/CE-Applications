// RegIntel has no public front door.
//
// Marketing, pricing and payment all live on the Conform-Edge website. Access
// is granted there and handed off to /enter. This page exists only so someone
// who lands here directly — a stale bookmark, an expired session — is sent
// somewhere useful rather than seeing a 404.
//
// Deliberately contains no marketing copy and no pricing: keeping two sets of
// commercial claims in sync across two systems is how they end up
// contradicting each other.

import { ExternalIcon } from './_components/icons';

import BrandMark from './_components/BrandMark';
const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://conform-edge.com';

export default function EntryPage() {
  return (
    <main className="min-h-screen bg-rail flex items-center justify-center p-6">
      <div className="bg-surface rounded-2xl shadow-lift w-full max-w-md p-8 text-center border border-line">
        <BrandMark size={48} className="mx-auto mb-5" />

        <h1 className="text-xl font-bold text-ink mb-2 tracking-tight">
          Conform-Edge RegIntel™
        </h1>

        <p className="text-sm text-muted mb-6 leading-relaxed">
          RegIntel is accessed through your Conform-Edge account. Sign in on the
          main site and open RegIntel from your dashboard.
        </p>

        <a
          href={WEBSITE_URL}
          className="flex items-center justify-center gap-2 w-full bg-brand text-white font-semibold py-3 rounded-xl hover:brightness-110 transition"
        >
          Go to Conform-Edge
          <ExternalIcon size={16} />
        </a>

        <p className="text-xs text-faint mt-6 leading-relaxed">
          Already signed in and seeing this page? Your session has expired.
          Return to the site above to continue.
        </p>
      </div>
    </main>
  );
}
