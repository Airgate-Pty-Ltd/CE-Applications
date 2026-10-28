/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import '@/styles/hf-intelligence.css';
import type { ReactNode } from 'react';

/** Intelligence workspace layout — bypasses AppShell. D-069 §5. */
export default function IntelligenceLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
