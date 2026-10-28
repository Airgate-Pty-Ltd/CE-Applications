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
import KernelConditionsClient from './KernelConditionsClient';

/** WP-3 screen 2: Kernel Conditions panel (three-response contract + Authority Charter +
 * advisory badge). QM role only. */
export default async function KernelConditionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'qm') redirect('/dashboard');

  return (
    <AppShell role={user.role} userName={user.name}>
      <KernelConditionsClient />
    </AppShell>
  );
}
