// Terms of Service for Conform-Edge RegIntel.
//
// Boilerplate calibrated to what RegIntel actually is — a regulatory-awareness
// relying-party app whose billing and account management live on the
// Conform-Edge website. Operating entity and governing-law jurisdiction should
// be confirmed by counsel before launch (marked below).

import type { Metadata } from 'next';
import LegalChrome from '@/app/_components/LegalChrome';

const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://conform-edge.com';
const EFFECTIVE_DATE = '24 July 2026';

export const metadata: Metadata = {
  title: 'Terms of Service — Conform-Edge RegIntel™',
  description: 'The terms governing access to and use of Conform-Edge RegIntel.',
};

export default function TermsPage() {
  return (
    <LegalChrome>
      <h1 className="text-2xl font-bold text-ink mb-1 tracking-tight">Terms of Service</h1>
      <p className="text-sm text-faint mb-8">Effective {EFFECTIVE_DATE}</p>

      <p className="text-muted mb-6 leading-relaxed">
        These Terms of Service (the &ldquo;Terms&rdquo;) govern your access to and use of
        Conform-Edge RegIntel&trade; (the &ldquo;Service&rdquo;), a regulatory-intelligence
        service operated by Conform-Edge (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;).
        By accessing the Service you agree to be bound by these Terms. If you do not agree,
        do not use the Service.
      </p>

      <Section n="1" title="The Service">
        RegIntel collects, organises and summarises publicly published regulatory material
        from aviation, quality and related authorities and standards bodies, and presents it
        as a daily-updated feed and report. The Service is provided for informational and
        awareness purposes only.
      </Section>

      <Section n="2" title="Access through your Conform-Edge account">
        Access to RegIntel is granted through your Conform-Edge account. Subscription,
        billing and account management are handled on the{' '}
        <a href={WEBSITE_URL} className="text-steel underline">Conform-Edge website</a>{' '}
        and are governed by the terms presented there. Your right to use the Service depends
        on your account remaining active and in good standing. You are responsible for
        maintaining the confidentiality of your credentials and for all activity under your
        account.
      </Section>

      <Section n="3" title="Not legal, regulatory or professional advice">
        Regulatory content in the Service is provided <strong>&ldquo;as is&rdquo;</strong> for
        general awareness. It is not legal, regulatory, compliance or other professional
        advice, and it is not a substitute for the official publications of the relevant
        authority. While the Service links to and cites authoritative sources, we do not
        warrant that the information is complete, current, accurate or fit for any particular
        purpose. You must independently verify any item against the authority&rsquo;s official
        source before relying on it, and you remain solely responsible for your compliance
        decisions.
      </Section>

      <Section n="4" title="Acceptable use">
        You agree not to: (a) resell, redistribute or make the Service available to anyone
        outside your organisation&rsquo;s licensed users; (b) scrape, bulk-export or
        systematically extract content except through features we provide; (c) attempt to
        circumvent access controls or interfere with the operation or security of the
        Service; or (d) use the Service in violation of any applicable law.
      </Section>

      <Section n="5" title="Intellectual property">
        The Service, including its compilation, organisation, summaries and presentation of
        regulatory material, is owned by us or our licensors and is protected by applicable
        intellectual-property laws. Underlying regulatory texts remain the property of their
        respective publishing authorities. We grant you a limited, non-exclusive,
        non-transferable right to access and use the Service for your internal business
        purposes for the duration of your subscription.
      </Section>

      <Section n="6" title="Disclaimers and limitation of liability">
        To the maximum extent permitted by law, the Service is provided without warranties of
        any kind, whether express or implied, including implied warranties of merchantability,
        fitness for a particular purpose and non-infringement. To the maximum extent permitted
        by law, we will not be liable for any indirect, incidental, special, consequential or
        exemplary damages, or for any loss arising from reliance on regulatory information
        obtained through the Service. Nothing in these Terms excludes or limits any liability
        that cannot lawfully be excluded or limited, including certain rights you may have under
        consumer-protection law.
      </Section>

      <Section n="7" title="Suspension and termination">
        We may suspend or terminate access to the Service if you breach these Terms, if your
        Conform-Edge account lapses, or as otherwise permitted by the terms of your
        subscription. You may stop using the Service at any time through your Conform-Edge
        account.
      </Section>

      <Section n="8" title="Changes to these Terms">
        We may update these Terms from time to time. Where changes are material we will take
        reasonable steps to notify you. Your continued use of the Service after changes take
        effect constitutes acceptance of the updated Terms.
      </Section>

      <Section n="9" title="Governing law">
        These Terms are governed by the laws of the jurisdiction in which the operating entity
        for Conform-Edge is established, without regard to its conflict-of-laws rules. The
        courts of that jurisdiction will have exclusive jurisdiction over any dispute arising
        from these Terms, subject to any non-excludable rights you may have under local law.
      </Section>

      <Section n="10" title="Contact">
        Questions about these Terms can be raised through the{' '}
        <a href={`${WEBSITE_URL}/contact`} className="text-steel underline">Conform-Edge website</a>.
      </Section>
    </LegalChrome>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold text-ink mb-2">{n}. {title}</h2>
      <p className="text-muted leading-relaxed">{children}</p>
    </section>
  );
}
