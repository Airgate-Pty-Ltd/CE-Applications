/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createUserSession } from '@/lib/session';
import { GET as listCourses } from '../route';
import { GET as getCourse } from '../[courseId]/route';

describe('legacy LMS tenant isolation', () => {
  const tag = `course-tenant-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const previousSecret = process.env.SESSION_SECRET;
  let organizationA: string;
  let organizationB: string;
  let userId: string;
  let courseA: string;
  let courseB: string;
  let token: string;

  beforeAll(async () => {
    process.env.SESSION_SECRET = 'test-only-session-secret-with-at-least-32-bytes';
    const [a, b] = await Promise.all([
      prisma.organization.create({ data: { slug: `${tag}-a`, name: `${tag} A` } }),
      prisma.organization.create({ data: { slug: `${tag}-b`, name: `${tag} B` } }),
    ]);
    organizationA = a.id;
    organizationB = b.id;
    const user = await prisma.user.create({
      data: {
        email: `${tag}@example.com`,
        passwordHash: 'x',
        name: tag,
        organizationMemberships: {
          create: [
            { organizationId: organizationA, role: 'learner' },
            { organizationId: organizationB, role: 'learner' },
          ],
        },
      },
    });
    userId = user.id;
    const [owned, foreign] = await Promise.all([
      prisma.course.create({ data: { organizationId: organizationA, title: `${tag} visible` } }),
      prisma.course.create({ data: { organizationId: organizationB, title: `${tag} hidden` } }),
    ]);
    courseA = owned.id;
    courseB = foreign.id;
    await prisma.courseEnrollment.createMany({
      data: [
        { learnerId: userId, courseId: courseA },
        { learnerId: userId, courseId: courseB },
      ],
    });
    token = (await createUserSession(userId, 'tenant-route-test', organizationA)).token;
  });

  afterAll(async () => {
    await prisma.course.deleteMany({ where: { id: { in: [courseA, courseB] } } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.organization.deleteMany({ where: { id: { in: [organizationA, organizationB] } } });
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
  });

  function request(url: string) {
    return new NextRequest(url, { headers: { cookie: `session=${token}` } });
  }

  test('lists only courses owned by the active session organization', async () => {
    const response = await listCourses(request('http://localhost/api/courses'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.courses.map((course: { id: string }) => course.id)).toEqual([courseA]);
  });

  test('does not resolve an enrolled course from another active membership', async () => {
    const response = await getCourse(
      request(`http://localhost/api/courses/${courseB}`),
      { params: Promise.resolve({ courseId: courseB }) },
    );
    expect(response.status).toBe(404);
  });
});
