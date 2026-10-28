/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import { readDeploymentConfig, DeploymentConfig } from '@/lib/deploymentConfig';

/**
 * Health/Status Screen: Phase 3 WP-5 deployment hardening.
 *
 * Five states per PHASE-3-RUN-DIRECTIVE.md WP-5: Online, Local Only, Degraded,
 * AI Service Unavailable, Backup Overdue. Precedence (most to least severe):
 * DB unreachable > AI expected-but-unavailable > backup stale/missing > baseline
 * (Online for edition=online, Local Only for edition=onprem).
 */

export type HealthState = 'ONLINE' | 'LOCAL_ONLY' | 'DEGRADED' | 'AI_SERVICE_UNAVAILABLE' | 'BACKUP_OVERDUE';

export const DEFAULT_BACKUP_STALE_DAYS = 7;

export interface BackupManifest {
  timestamp: string;
  file: string;
  sha256: string;
  sizeBytes: number;
}

export interface HealthReport {
  state: HealthState;
  config: DeploymentConfig;
  database: { reachable: boolean; latencyMs: number | null; error?: string };
  ai: { expected: boolean; reachable: boolean };
  backup: { manifest: BackupManifest | null; ageDays: number | null; stale: boolean };
  checkedAt: string;
}

export class HealthStatusService {
  private prisma: PrismaClient;
  private backupManifestPath: string;
  private backupStaleDays: number;

  constructor(prisma: PrismaClient, options?: { backupManifestPath?: string; backupStaleDays?: number }) {
    this.prisma = prisma;
    this.backupManifestPath = options?.backupManifestPath || 'docker/backups/latest.json';
    this.backupStaleDays = options?.backupStaleDays ?? DEFAULT_BACKUP_STALE_DAYS;
  }

  async checkDatabase(): Promise<{ reachable: boolean; latencyMs: number | null; error?: string }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { reachable: true, latencyMs: Date.now() - start };
    } catch (error) {
      return { reachable: false, latencyMs: null, error: error instanceof Error ? error.message : 'Unknown database error' };
    }
  }

  /** Honest check: aiProviderMode='none' means no AI expected (not a failure). 'local'/'configured' require a real reachable endpoint, which this codebase does not currently wire (see AiAssist's no-provider fallback) — so those modes report unreachable rather than assuming success. */
  checkAi(config: DeploymentConfig): { expected: boolean; reachable: boolean } {
    const expected = config.aiProviderMode !== 'none';
    if (!expected) return { expected: false, reachable: true };
    const hasProviderConfigured = !!process.env.AI_PROVIDER_API_KEY || !!process.env.AI_PROVIDER_ENDPOINT;
    return { expected: true, reachable: hasProviderConfigured };
  }

  readBackupManifest(): BackupManifest | null {
    if (!fs.existsSync(this.backupManifestPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(this.backupManifestPath, 'utf8'));
    } catch {
      return null;
    }
  }

  checkBackup(): { manifest: BackupManifest | null; ageDays: number | null; stale: boolean } {
    const manifest = this.readBackupManifest();
    if (!manifest) return { manifest: null, ageDays: null, stale: true }; // never backed up = overdue, not silently healthy
    const ageMs = Date.now() - new Date(manifest.timestamp).getTime();
    const ageDays = ageMs / (24 * 60 * 60 * 1000);
    return { manifest, ageDays, stale: ageDays > this.backupStaleDays };
  }

  async getHealth(): Promise<HealthReport> {
    const config = readDeploymentConfig();
    const database = await this.checkDatabase();
    const ai = this.checkAi(config);
    const backup = this.checkBackup();

    let state: HealthState;
    if (!database.reachable) {
      state = 'DEGRADED';
    } else if (ai.expected && !ai.reachable) {
      state = 'AI_SERVICE_UNAVAILABLE';
    } else if (backup.stale) {
      state = 'BACKUP_OVERDUE';
    } else if (config.edition === 'online') {
      state = 'ONLINE';
    } else {
      state = 'LOCAL_ONLY';
    }

    return { state, config, database, ai, backup, checkedAt: new Date().toISOString() };
  }
}
