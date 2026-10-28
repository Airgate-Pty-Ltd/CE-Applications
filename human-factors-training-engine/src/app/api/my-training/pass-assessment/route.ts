/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { NextRequest, NextResponse } from 'next/server';

/** Retired insecure compatibility endpoint: it formerly accepted no answers and marked the
 * assignment passed. Keeping an explicit 410 prevents old clients from silently fabricating
 * completion while directing controlled clients to the scored assessment endpoint. */
export async function POST(request: NextRequest) {
  void request;
  return NextResponse.json(
    { error: 'This outcome-only endpoint was retired. Submit scored responses to /api/my-training/submit-assessment.' },
    { status: 410 },
  );
}
