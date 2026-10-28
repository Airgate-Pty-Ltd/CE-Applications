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
import BurdenBudgetClient from './BurdenBudgetClient';

/** WP-4.3: Training Burden Budget disposition queue. QM + supervisor roles. */
export default async function BurdenBudgetPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'qm' && user.role !== 'supervisor') redirect('/dashboard');

  return (
    <AppShell role={user.role} userName={user.name}>
      <BurdenBudgetClient />
    </AppShell>
  );
}
