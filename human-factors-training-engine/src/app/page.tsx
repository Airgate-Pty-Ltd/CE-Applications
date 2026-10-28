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

export default async function Home() {
  if (await getCurrentUser()) {
    redirect('/dashboard');
  }

  redirect('/login');
}
