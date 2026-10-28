'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase-client';
import { CheckIcon, ExternalIcon } from '@/app/_components/icons';

// Billing lives entirely on the Conform-Edge website. This page is read-only:
// it shows the entitlement RegIntel received at sign-in and links back to the
// website for anything that changes it. RegIntel never sells or charges.
const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://conform-edge.com';

interface Profile {
  email: string;
  subscription_tier: string;
  subscription_status: string;
  created_at: string;
}

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  basic: { label: 'Basic', color: 'bg-low-bg text-low-ink' },
  pro: { label: 'Pro', color: 'bg-accent-soft text-accent-ink' },
  enterprise: { label: 'Enterprise', color: 'bg-norm-bg text-norm-ink' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-good-bg text-good-ink' },
  trialing: { label: 'Trial active', color: 'bg-norm-bg text-norm-ink' },
  past_due: { label: 'Past due', color: 'bg-crit-bg text-crit-ink' },
  cancelled: { label: 'Cancelled', color: 'bg-low-bg text-low-ink' },
};

const ARCHIVE_DEPTH: Record<string, string> = {
  enterprise: 'Unlimited',
  pro: '90 days',
  basic: '30 days',
};

const SEATS: Record<string, string> = {
  enterprise: 'Unlimited',
  pro: '3',
  basic: '1',
};

const PLAN_FEATURES = [
  'Regulatory monitoring, updated every weekday',
  'Priority alert feed with urgent / high / normal classification',
  'Every item traceable to the publishing authority’s own record',
  'Full report download (Markdown)',
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('email, subscription_tier, subscription_status, created_at')
        .eq('id', user.id)
        .single();

      setProfile(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-[3px] border-line-strong border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const tierInfo = TIER_LABELS[profile.subscription_tier] || TIER_LABELS.basic;
  const statusInfo = STATUS_LABELS[profile.subscription_status] || STATUS_LABELS.active;
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const depth = ARCHIVE_DEPTH[profile.subscription_tier] ?? ARCHIVE_DEPTH.basic;

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8">
      <h1 className="text-2xl font-bold text-ink tracking-tight mb-6">Your access</h1>

      {/* Account */}
      <div className="bg-surface rounded-xl border border-line p-6 mb-5 shadow-card">
        <h2 className="text-xs font-bold text-faint uppercase tracking-[0.08em] mb-4">Account</h2>
        <div className="flex flex-col gap-3">
          <Row label="Email"><span className="font-semibold text-ink">{profile.email}</span></Row>
          <Row label="Access since"><span className="font-semibold text-ink">{memberSince}</span></Row>
          <Row label="Status">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
          </Row>
        </div>
      </div>

      {/* Entitlement — read-only */}
      <div className="bg-surface rounded-xl border border-line p-6 mb-5 shadow-card">
        <h2 className="text-xs font-bold text-faint uppercase tracking-[0.08em] mb-4">Plan</h2>
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${tierInfo.color}`}>{tierInfo.label}</span>
        </div>

        <div className="bg-surface-2 border border-line rounded-lg p-3 text-sm text-muted mb-5">
          <span className="font-semibold text-ink">Archive depth: </span>{depth}
          <span className="mx-1.5 text-faint">·</span>
          <span className="font-semibold text-ink">Seats: </span>{SEATS[profile.subscription_tier] ?? SEATS.basic}
        </div>

        <div className="pt-4 border-t border-line">
          <p className="text-sm text-muted mb-3 leading-relaxed">
            Your subscription is managed on the Conform-Edge website. Change your plan, update
            payment details or view invoices there.
          </p>
          <a
            href={`${WEBSITE_URL}/account`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:brightness-110 transition"
          >
            Manage subscription <ExternalIcon size={14} />
          </a>
        </div>
      </div>

      {/* Plan features */}
      <div className="bg-surface-2 rounded-xl border border-line p-5">
        <h2 className="text-sm font-bold text-ink mb-3">Your plan includes</h2>
        <ul className="flex flex-col gap-2 text-sm text-ink">
          {[...PLAN_FEATURES, `Archive access — ${depth}`].map(feat => (
            <li key={feat} className="flex items-start gap-2">
              <CheckIcon size={16} className="text-good-ink mt-0.5 shrink-0" />
              <span>{feat}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}
