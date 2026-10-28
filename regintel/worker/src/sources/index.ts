// Source registry.
//
// An authority appears here only when it has a real, structured source. There
// is no fallback that guesses: an authority with no configured source is
// reported as "not yet covered", never as "no activity". Those two things mean
// very different things to a subscriber and must never be conflated.

import type { Source, SourceResult } from './types';
import { federalRegisterSource } from './federal-register';

/** Authorities with an authoritative structured source configured. */
export const SOURCES: Source[] = [
  federalRegisterSource({
    authority: 'FAA',
    authorityName: 'Federal Aviation Administration',
    agencySlug: 'federal-aviation-administration',
  }),
  federalRegisterSource({
    authority: 'FDA',
    authorityName: 'US Food and Drug Administration',
    agencySlug: 'food-and-drug-administration',
  }),
];

/**
 * Authorities in scope per the product spec that do NOT yet have a verified
 * source. Surfaced explicitly in every report so the gap is visible rather
 * than silently looking like a quiet news day.
 *
 * Each needs its own structured feed before it can be covered. Adding one is
 * a matter of writing a source module and registering it above — no other
 * part of the pipeline changes.
 */
export const UNCOVERED_AUTHORITIES: { authority: string; name: string; note: string }[] = [
  { authority: 'EASA', name: 'European Union Aviation Safety Agency', note: 'Needs EASA publications feed' },
  { authority: 'UK_CAA', name: 'UK Civil Aviation Authority', note: 'Needs CAP publication feed' },
  { authority: 'TCCA', name: 'Transport Canada Civil Aviation', note: 'Needs TCCA feed' },
  { authority: 'HEALTH_CANADA', name: 'Health Canada', note: 'Needs Canada Gazette feed' },
  { authority: 'CAAC', name: 'Civil Aviation Administration of China', note: 'Needs CCAR feed' },
  { authority: 'ANAC', name: 'Brazil National Civil Aviation Agency', note: 'Needs RBAC feed' },
  { authority: 'IAQG', name: 'International Aerospace Quality Group', note: 'No public feed; may require licensed access' },
  { authority: 'ISO', name: 'International Organization for Standardization', note: 'No public feed; may require licensed access' },
  { authority: 'SAE', name: 'SAE International', note: 'No public feed; may require licensed access' },
  { authority: 'IATF', name: 'International Automotive Task Force', note: 'No public feed; may require licensed access' },
];

/**
 * Pull every configured source.
 *
 * One failing source must never take down the run: failures are captured per
 * source and reported, and the rest still produce findings.
 */
export async function pullAllSources(sinceDays: number): Promise<SourceResult[]> {
  return Promise.all(
    SOURCES.map(async (source): Promise<SourceResult> => {
      try {
        const findings = await source.fetch(sinceDays);
        return {
          sourceId: source.id,
          authority: source.authority,
          authorityName: source.authorityName,
          findings,
          ok: true,
        };
      } catch (err) {
        return {
          sourceId: source.id,
          authority: source.authority,
          authorityName: source.authorityName,
          findings: [],
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    })
  );
}

export type { Finding, Source, SourceResult, VerificationLevel, Priority } from './types';
