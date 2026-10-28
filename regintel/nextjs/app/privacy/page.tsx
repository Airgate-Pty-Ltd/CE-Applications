// Privacy Policy for Conform-Edge RegIntel.
//
// Scoped to what the relying-party app actually processes: an identity handed
// off from the Conform-Edge website plus entitlement and access data. RegIntel
// holds no payment details — billing lives on the website. Operating entity,
// governing-law jurisdiction and the confirmed sub-processor list should be
// reviewed by counsel before launch.

import type { Metadata } from 'next';
import LegalChrome from '@/app/_components/LegalChrome';

const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://conform-edge.com';
const EFFECTIVE_DATE = '24 July 2026';

export const metadata: Metadata = {
  title: 'Privacy Policy — Conform-Edge RegIntel™',
  description: 'How Conform-Edge RegIntel handles personal information.',
};

export default function PrivacyPage() {
  return (
    <LegalChrome>
      <h1 className="text-2xl font-bold text-ink mb-1 tracking-tight">Privacy Policy</h1>
      <p className="text-sm text-faint mb-8">Effective {EFFECTIVE_DATE}</p>

      <p className="text-muted mb-6 leading-relaxed">
        This Privacy Policy explains how Conform-Edge (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or
        &ldquo;our&rdquo;) handles personal information in connection with Conform-Edge
        RegIntel&trade; (the &ldquo;Service&rdquo;). RegIntel is accessed through your
        Conform-Edge account; account creation, subscription and payment take place on the{' '}
        <a href={WEBSITE_URL} className="text-steel underline">Conform-Edge website</a>,
        which has its own privacy notice covering those activities.
      </p>

      <Section n="1" title="Information we process">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Account identity.</strong> When the Conform-Edge website grants you access,
            it hands off identifying information such as your email address and account
            identifier so the Service can recognise you.
          </li>
          <li>
            <strong>Entitlement data.</strong> Your subscription status and access tier, used
            to determine what the Service makes available to you.
          </li>
          <li>
            <strong>Usage and technical data.</strong> Access logs, feature interactions,
            device and browser information, and similar technical data generated when you use
            the Service.
          </li>
          <li>
            <strong>Preferences.</strong> Settings such as source and category filters you
            configure within the Service.
          </li>
        </ul>
      </Section>

      <Section n="2" title="What we do not hold">
        RegIntel does not collect or store your payment card details. Billing is handled on the
        Conform-Edge website by its payment processor; we receive only the subscription status
        needed to grant access.
      </Section>

      <Section n="3" title="How we use information">
        We use personal information to authenticate you and grant appropriate access, operate
        and secure the Service, deliver the regulatory feed and reports, respond to support
        requests, and meet legal obligations. We do not sell your personal information.
      </Section>

      <Section n="4" title="Service providers">
        We rely on third-party infrastructure providers to run the Service — including cloud
        hosting, database and authentication, and background-processing providers. These
        providers process personal information on our behalf under agreements that restrict
        their use of it to providing services to us.
      </Section>

      <Section n="5" title="Data retention">
        We retain personal information for as long as your account is active and as needed to
        provide the Service, then for any additional period required to meet legal, accounting
        or reporting obligations. Access and usage logs are kept for a limited period for
        security and operational purposes.
      </Section>

      <Section n="6" title="Security">
        We use technical and organisational measures appropriate to the risk to protect
        personal information, including access controls and encryption in transit. No method of
        transmission or storage is completely secure, and we cannot guarantee absolute
        security.
      </Section>

      <Section n="7" title="International transfers">
        Personal information may be processed in countries other than the one in which you are
        located. Where it is transferred internationally, we take steps to ensure an
        appropriate level of protection as required by applicable law.
      </Section>

      <Section n="8" title="Your rights">
        Depending on your location, you may have rights to access, correct, delete or restrict
        the processing of your personal information, or to object to it. Many of these can be
        exercised through your Conform-Edge account; you can also contact us using the details
        below. We will respond in accordance with applicable law.
      </Section>

      <Section n="9" title="Changes to this policy">
        We may update this Privacy Policy from time to time. Where changes are material we will
        take reasonable steps to notify you, and we will update the effective date above.
      </Section>

      <Section n="10" title="Contact">
        For privacy questions or to exercise your rights, contact us through the{' '}
        <a href={`${WEBSITE_URL}/contact`} className="text-steel underline">Conform-Edge website</a>.
      </Section>
    </LegalChrome>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold text-ink mb-2">{n}. {title}</h2>
      <div className="text-muted leading-relaxed">{children}</div>
    </section>
  );
}
