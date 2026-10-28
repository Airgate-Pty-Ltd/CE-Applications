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
import LessonsLearnedClient from './LessonsLearnedClient';

/** M-1: Lessons Learned authoring hub. QM and supervisor roles. */
export default async function LessonsLearnedPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'learner') redirect('/my-training');

  return (
    <AppShell role={user.role} userName={user.name}>
      <LessonsLearnedClient />
    </AppShell>
  );
}
