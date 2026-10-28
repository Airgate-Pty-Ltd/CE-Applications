/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import { PrismaClient } from '@prisma/client';
import { provisionLessonAuthorityProfile } from '../src/lib/authorityProfile';

const prisma = new PrismaClient();

async function main() {
  const profile = await provisionLessonAuthorityProfile(prisma);
  console.log(`Authority profile ${profile.authorityProfileId} v${profile.version} is ${profile.status} (id=${profile.id}, hash=${profile.profileHash.slice(0, 16)}...).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
