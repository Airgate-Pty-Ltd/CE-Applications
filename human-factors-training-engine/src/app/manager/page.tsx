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
import ManagerClient from './ManagerClient';

/** WP-3 screen 5: Manager five-minute view (pending observations, one-tap effectiveness
 * verification). Supervisor (and QM, for demo convenience) roles. */
export default async function ManagerPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'supervisor' && user.role !== 'qm') redirect('/dashboard');

  return (
    <AppShell role={user.role} userName={user.name}>
      <ManagerClient />
    </AppShell>
  );
}
