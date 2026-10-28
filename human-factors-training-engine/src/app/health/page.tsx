/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/currentUser';
import AppShell from '@/components/AppShell';
import HealthStatusClient from './HealthStatusClient';
import { hasAnyRole, OVERSIGHT_ROLES } from '@/lib/authorization';

/** WP-5.3: operational health contains sensitive deployment details; oversight roles only. */
export default async function HealthPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!hasAnyRole(user.role, OVERSIGHT_ROLES)) redirect('/');

  return (
    <AppShell role={user.role} userName={user.name}>
      <HealthStatusClient />
    </AppShell>
  );
}
