/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/currentUser';
import HostedConnectorsClient from './HostedConnectorsClient';

export default async function HostedConnectorsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/dashboard');
  return <HostedConnectorsClient />;
}
