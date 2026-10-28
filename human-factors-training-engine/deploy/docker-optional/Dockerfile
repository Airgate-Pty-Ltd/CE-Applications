# Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
# This source code is proprietary and confidential. Unauthorized copying,
# distribution, or use of this file, via any medium, is strictly prohibited
# without prior written permission from Conform-Edge Quality Consulting LLC.
# See LICENSE and NOTICE at the repository root.
#
# WP-5: multi-stage build -> Next.js standalone runtime image.
# node:20-slim (Debian, not Alpine) deliberately: Prisma's query engine has known
# musl/glibc friction on Alpine; slim avoids that class of problem entirely.
#
# Reclassified under the Standalone Packaging Directive (2026-08-06, DECISIONS.md D-048):
# Docker is an OPTIONAL alternative packaging path, not part of the standalone product's
# install path (see docs/03-architecture/DEPENDENCY-FOOTPRINT.md). This file now lives at
# deploy/docker-optional/ and must be built with the REPO ROOT as build context (see the
# sibling docker-compose.yml, which sets context: ../.. and dockerfile: Dockerfile) so the
# `COPY . .` and `COPY package.json ...` lines below still resolve correctly.

FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS builder
WORKDIR /app
ARG PRISMA_SCHEMA=prisma/schema.prisma
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema "$PRISMA_SCHEMA"
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
    && apt-get install -y --no-install-recommends clamav \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY deploy/docker-optional/docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x ./docker/entrypoint.sh && mkdir -p /app/data /app/incoming && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker/entrypoint.sh"]
