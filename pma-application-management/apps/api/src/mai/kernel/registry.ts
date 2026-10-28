import type { DimManifest, Rule } from './types';
import { canonicalize, sha256Hex } from './hash';

// Version-controlled rule registry. Validation fails LOUDLY on missing required
// configuration fields — the kernel then disables itself and the host is
// unaffected (design law 10, AT-13). Dispatch is manifest-driven (design law 11):
// rules are selected by every DIM whose subscribesTo includes the event type —
// never by name prefix.

export class RegistryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegistryValidationError';
  }
}

export interface LoadedDim {
  manifest: DimManifest;
  rules: Rule[];
}

export interface RegistryRow {
  ruleId: string;
  dimId: string;
  revision: number;
  effectiveDate: string;
  approvedBy: string;
  definition: Rule;
  definitionHash: string;
}

const REQUIRED_RULE_FIELDS: (keyof Rule)[] = [
  'ruleId',
  'dimId',
  'revision',
  'effectiveDate',
  'approvedBy',
  'severity',
  'gapClass',
  'category',
  'findingText',
  'clauseRefs',
  'condition',
];

const REQUIRED_MANIFEST_FIELDS: (keyof DimManifest)[] = [
  'dimId',
  'description',
  'subscribesTo',
  'version',
  'publishedAt',
];

export class RuleRegistry {
  private dims: LoadedDim[] = [];

  constructor(dims: LoadedDim[]) {
    for (const dim of dims) this.validateDim(dim);
    this.dims = dims;
  }

  private validateDim(dim: LoadedDim): void {
    for (const f of REQUIRED_MANIFEST_FIELDS) {
      if (dim.manifest[f] === undefined || dim.manifest[f] === null) {
        throw new RegistryValidationError(
          `DIM manifest missing required field '${String(f)}'`,
        );
      }
    }
    for (const rule of dim.rules) {
      for (const f of REQUIRED_RULE_FIELDS) {
        const v = rule[f];
        if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
          throw new RegistryValidationError(
            `Rule '${rule.ruleId ?? '<unknown>'}' missing required field '${String(f)}'`,
          );
        }
      }
      if (rule.dimId !== dim.manifest.dimId) {
        throw new RegistryValidationError(
          `Rule '${rule.ruleId}' dimId '${rule.dimId}' does not match manifest '${dim.manifest.dimId}'`,
        );
      }
    }
  }

  // All rules to evaluate for an event: from EVERY DIM subscribed to the event
  // type, minus rules whose own `events` filter excludes it.
  rulesForEvent(eventType: string): { dim: DimManifest; rule: Rule }[] {
    const out: { dim: DimManifest; rule: Rule }[] = [];
    for (const dim of this.dims) {
      if (!dim.manifest.subscribesTo.includes(eventType)) continue;
      for (const rule of dim.rules) {
        if (rule.events && !rule.events.includes(eventType)) continue;
        out.push({ dim: dim.manifest, rule });
      }
    }
    return out;
  }

  // Rows for the mai_rule_registry table and for the evidence export manifest.
  registryRows(): RegistryRow[] {
    const rows: RegistryRow[] = [];
    for (const dim of this.dims) {
      for (const rule of dim.rules) {
        rows.push({
          ruleId: rule.ruleId,
          dimId: rule.dimId,
          revision: rule.revision,
          effectiveDate: rule.effectiveDate,
          approvedBy: rule.approvedBy,
          definition: rule,
          definitionHash: sha256Hex(canonicalize(rule)),
        });
      }
    }
    return rows;
  }

  manifests(): DimManifest[] {
    return this.dims.map((d) => d.manifest);
  }
}
