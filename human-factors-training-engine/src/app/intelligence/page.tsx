/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { resolveSessionToken } from '@/lib/session';
import { SESSION_COOKIE_NAME } from '@/lib/sessionToken';
import { loadIntelligenceWorkspaceData } from '@/lib/intelligence/intelligence-adapter';
import { IntelligenceController } from '@/components/intelligence/IntelligenceController';

/** Intelligence Workspace — QM, trainer, and admin roles. D-069. */
export default async function IntelligencePage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = await resolveSessionToken(token);

  if (!session) redirect('/login');

  const { user, organizationId, membership, organization } = session;

  // Learners see their training view, not the intelligence workspace
  if (membership.role === 'learner') redirect('/my-training');

  const data = await loadIntelligenceWorkspaceData(
    organizationId,
    user.id,
    user.name,
    organization.name
  );

  return <IntelligenceController data={data} />;
}
