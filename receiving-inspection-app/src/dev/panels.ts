import { routeInspection } from '../engine/router';
import { evaluateToolGate } from '../engine/calibration';
import { evaluateRetention, PRODUCT_DEFAULT_RETENTION_YEARS } from '../engine/retention';
import { nextNcrAction, canPerform } from '../engine/ncr';
import { capabilitiesFor } from '../auth/roles';
import { UNCONFIGURED_SAMPLING_TABLE } from '../schema/sampling';
import { TEST_SAMPLING_TABLE, makeReceipt } from '../fixtures/receipts';
import { STANDARD_RECEIVING_PACK } from '../content/receiving-pack';
import {
  createDraft,
  signRecord,
  applyResult,
  reviseRecord,
  recordMetadata,
  type InspectionRecord,
} from '../documents/record';
import { MemoryStorageProvider } from '../storage/memory';
import { SharePointStorageProvider } from '../storage/sharepoint';
import { FakeGraphClient } from '../storage/sharepoint.fake';
import { WebDavStorageProvider, S3StorageProvider } from '../storage/stubs';
import { runProviderContract } from '../storage/contract';
import { SyncQueue, MemoryQueueStore } from '../sync/queue';
import { LockHeldError, type StorageProvider } from '../storage/provider';
import { SCENARIOS } from './scenarios';
import type { NonconformanceRecord, Role } from '../schema/ncr';

/**
 * Test dashboard panels.
 *
 * A DELIVERABLE, not a debug page. Each panel states what it proves, so green
 * means that claim can be trusted without reading the code.
 *
 * Panel logic lives here as plain functions rather than inside components: it
 * is then unit-testable, and the dashboard cannot quietly diverge from what the
 * test suite actually verifies.
 */

export interface PanelRow {
  readonly label: string;
  readonly passed: boolean;
  readonly detail: string;
}

export interface PanelResult {
  readonly id: number;
  readonly title: string;
  readonly proves: string;
  readonly rows: PanelRow[];
  readonly passed: boolean;
}

const NOW = '2026-07-24T10:00:00.000Z';
const TODAY = '2026-07-24';
const pack = STANDARD_RECEIVING_PACK;

function panel(id: number, title: string, proves: string, rows: PanelRow[]): PanelResult {
  return { id, title, proves, rows, passed: rows.every((r) => r.passed) };
}

function completeRecord(receipt = makeReceipt({}), fail = false): InspectionRecord {
  let current = createDraft({
    id: 'IR-DASH',
    receipt,
    pack,
    samplingTable: TEST_SAMPLING_TABLE,
  });
  for (const checkId of current.requiredCheckIds) {
    const definition = pack.checks.find((c) => c.id === checkId);
    const outcome = applyResult(current, {
      checkId,
      value: fail && checkId === 'PHY-FOD' ? 'fail' : 'pass',
      evidenceRefs: definition?.evidenceRequired === true ? ['evidence-1'] : [],
      toolId: definition?.requiresMeasurement === true ? 'TOOL-1' : null,
      note: null,
    });
    if (outcome.ok) current = outcome.record;
  }
  return {
    ...current,
    toolsUsed: current.results
      .filter((r) => r.toolId !== null)
      .map((r) => ({
        checkId: r.checkId,
        toolId: r.toolId as string,
        calibrationDueDate: '2026-12-31',
      })),
  };
}

function signed(record: InspectionRecord) {
  return signRecord({
    record,
    pack,
    samplingTable: TEST_SAMPLING_TABLE,
    signedBy: 'u1',
    signedByName: 'Inspector One',
    role: 'inspector',
    signedAt: NOW,
  });
}

// --- 1 ----------------------------------------------------------------------
export function panelScenarioRunner(): PanelResult {
  const rows = SCENARIOS.map((scenario) => {
    const table = scenario.id === 'S12' ? UNCONFIGURED_SAMPLING_TABLE : TEST_SAMPLING_TABLE;
    const decision = routeInspection({ receipt: scenario.receipt, samplingTable: table });
    return {
      label: `${scenario.id} ${scenario.title}`,
      passed: decision.path === scenario.expectedPath,
      detail: `expected ${scenario.expectedPath}, got ${decision.path}. ${scenario.proves}`,
    };
  });
  return panel(1, 'Scenario runner', 'Twelve fictional receipts route as intended.', rows);
}

// --- 2 ----------------------------------------------------------------------
export function panelPathRouterInspector(): PanelResult {
  const receipt = makeReceipt({
    documentation: { releaseDocument: 'certificate-of-conformance' },
    supplierStatus: 'probation',
    escalation: { openCorrectiveAction: true },
  });
  const decision = routeInspection({ receipt, samplingTable: TEST_SAMPLING_TABLE });

  const rows: PanelRow[] = decision.trace.map((firing) => ({
    label: `${firing.fired ? 'FIRED' : 'not met'} — ${firing.ruleId}`,
    passed: true,
    detail: firing.reason,
  }));
  rows.push({
    label: 'Escalation is attributable',
    passed: decision.escalationTriggers.length === 2 && decision.path === 'FULL_INSPECTION',
    detail: `escalated to ${decision.path} by: ${decision.escalationTriggers.join(', ')}`,
  });
  return panel(
    2,
    'Path router inspector',
    'Every rule that ran is shown in order, and an escalation to 100% always names its trigger.',
    rows
  );
}

// --- 3 ----------------------------------------------------------------------
export function panelDeterminism(): PanelResult {
  const receipt = makeReceipt({
    documentation: { releaseDocument: 'certificate-of-conformance' },
    escalation: { qualityEscapeInLookback: true },
  });
  const first = JSON.stringify(routeInspection({ receipt, samplingTable: TEST_SAMPLING_TABLE }));
  let identical = true;
  for (let i = 0; i < 100; i += 1) {
    if (
      JSON.stringify(routeInspection({ receipt, samplingTable: TEST_SAMPLING_TABLE })) !== first
    ) {
      identical = false;
      break;
    }
  }

  const recordA = JSON.stringify(completeRecord());
  const recordB = JSON.stringify(completeRecord());

  return panel(3, 'Determinism check', 'The same input always produces the same decision.', [
    { label: 'Routing, 100 runs', passed: identical, detail: 'byte-identical across 100 runs' },
    {
      label: 'Record construction',
      passed: recordA === recordB,
      detail: 'two independently built records are byte-identical',
    },
  ]);
}

// --- 4 ----------------------------------------------------------------------
export function panelImmutability(): PanelResult {
  const rows: PanelRow[] = [];
  const result = signed(completeRecord());
  if (!result.ok) {
    return panel(4, 'Immutability check', 'A signed record cannot be edited.', [
      { label: 'Signing', passed: false, detail: result.reasons.join('; ') },
    ]);
  }

  const mutation = applyResult(result.record, {
    checkId: 'PHY-FOD',
    value: 'fail',
    evidenceRefs: [],
    toolId: null,
    note: 'attempted edit',
  });
  rows.push({
    label: 'Mutating a signed record',
    passed: !mutation.ok,
    detail: mutation.ok ? 'MUTATION ACCEPTED — defect' : (mutation.reasons[0] ?? ''),
  });

  const resign = signed(result.record);
  rows.push({
    label: 'Re-signing a signed record',
    passed: !resign.ok,
    detail: resign.ok ? 'ACCEPTED — defect' : (resign.reasons[0] ?? ''),
  });

  const revised = reviseRecord(result.record, 'IR-DASH-R2');
  rows.push({
    label: 'Revision chain produced instead',
    passed: revised.ok && revised.record.supersedes === result.record.id,
    detail: revised.ok
      ? `revision ${revised.record.revision} supersedes ${revised.record.supersedes}`
      : revised.reasons.join('; '),
  });

  return panel(
    4,
    'Immutability check',
    'A signed record cannot be edited; corrections produce a referenced revision.',
    rows
  );
}

// --- 5 ----------------------------------------------------------------------
export function panelNcrTracer(): PanelResult {
  const base: NonconformanceRecord = {
    id: 'NCR-DASH',
    inspectionRecordId: 'IR-DASH',
    receiptId: 'RCPT-0001',
    failedCheckIds: ['PHY-FOD'],
    stage: 'RAISED',
    quarantine: null,
    useAsIs: null,
    supplierActionWarranted: null,
    disposition: null,
    approvals: [],
    supplierCorrectiveActionRef: null,
    returnMaterialAuthorisationRef: null,
  };
  const quarantine = { location: 'HOLD-A', recordedBy: 'u1', recordedAt: NOW };

  const walk = (ncr: NonconformanceRecord) => nextNcrAction(ncr);
  const rows: PanelRow[] = [
    {
      label: 'Raised',
      passed: walk(base).code === 'QUARANTINE_ARTICLE',
      detail: walk(base).description,
    },
    {
      label: 'Quarantined',
      passed: walk({ ...base, quarantine }).code === 'PERFORM_MATERIAL_REVIEW',
      detail: walk({ ...base, quarantine }).description,
    },
    {
      label: 'Use-as-is branch',
      passed: walk({ ...base, quarantine, useAsIs: true }).code === 'RECORD_USE_AS_IS_APPROVAL',
      detail: `requires ${walk({ ...base, quarantine, useAsIs: true }).requiredRole}`,
    },
    {
      label: 'Supplier action branch',
      passed:
        walk({ ...base, quarantine, useAsIs: false, supplierActionWarranted: true }).code ===
        'RAISE_SUPPLIER_CORRECTIVE_ACTION',
      detail: '8D, RMA, return to vendor',
    },
    {
      label: 'Scrap branch',
      passed:
        walk({ ...base, quarantine, useAsIs: false, supplierActionWarranted: false }).code ===
        'RECORD_SCRAP_APPROVAL',
      detail: 'scrap under documented approval',
    },
    {
      label: 'Terminal once disposed',
      passed: walk({ ...base, quarantine, useAsIs: true, disposition: 'USE_AS_IS' }).terminal,
      detail: 'chain complete',
    },
  ];
  return panel(
    5,
    'NCR route tracer',
    'Every disposition branch routes and requires an approver.',
    rows
  );
}

// --- 6 ----------------------------------------------------------------------
export function panelCalibrationGate(): PanelResult {
  const expired = evaluateToolGate({
    requiresMeasurement: true,
    tool: {
      id: 'TOOL-OOC',
      description: 'Digital calliper',
      calibrationDueDate: '2026-07-01',
      outOfService: false,
    },
    evaluationDate: TODAY,
  });
  const valid = evaluateToolGate({
    requiresMeasurement: true,
    tool: {
      id: 'TOOL-OK',
      description: 'Digital calliper',
      calibrationDueDate: '2026-12-31',
      outOfService: false,
    },
    evaluationDate: TODAY,
  });
  const none = evaluateToolGate({ requiresMeasurement: true, tool: null, evaluationDate: TODAY });

  return panel(
    6,
    'Calibration gate test',
    'An out-of-calibration tool BLOCKS the check — it is not a warning.',
    [
      { label: 'Out-of-calibration tool', passed: !expired.allowed, detail: expired.message },
      { label: 'No tool identified', passed: !none.allowed, detail: none.message },
      { label: 'In-calibration tool', passed: valid.allowed, detail: valid.message },
    ]
  );
}

// --- 7 ----------------------------------------------------------------------
export function panelDocumentPreview(): { result: PanelResult; record: InspectionRecord | null } {
  const outcome = signed(completeRecord());
  if (!outcome.ok) {
    return {
      result: panel(7, 'Document preview', 'The record and conformity layout render.', [
        { label: 'Build record', passed: false, detail: outcome.reasons.join('; ') },
      ]),
      record: null,
    };
  }
  const json = JSON.stringify(outcome.record, null, 2);
  return {
    result: panel(
      7,
      'Document preview',
      'The inspection record renders, and its structured JSON is what an ERP would consume.',
      [
        { label: 'Structured JSON', passed: json.length > 0, detail: `${json.length} bytes` },
        {
          label: 'Conformity record required by path',
          passed: outcome.record.routing.requiredForms.includes('CONFORMITY_RECORD'),
          detail: outcome.record.routing.requiredForms.join(', '),
        },
      ]
    ),
    record: outcome.record,
  };
}

// --- 8 ----------------------------------------------------------------------
const STRUCTURAL = [
  /P-8[0-9]{2}-[0-9]{2}/,
  /SOP-8[0-9]{2}-[0-9]{2}/,
  /F-8[0-9]{2}-[0-9]{2}/,
  /A-85[1]-[0-9]{2}/,
  /PQM-[0-9]{3}-[0-9]/,
  /T-75[2]-01/,
  /\b[A-Z0-9]{3}R[0-9]{3}[A-Z]\b/,
];

export function panelScrubAudit(): PanelResult {
  /* In-browser this can only scan the content and fixtures actually loaded.
     The authoritative gate is scripts/scrub-check.sh, which runs in the
     pre-commit hook and over full history in CI. This panel is a second look
     at the shipped content, not a replacement for it — stated plainly rather
     than implied green. */
  const corpus = JSON.stringify({ pack, scenarios: SCENARIOS });
  const hits = STRUCTURAL.filter((pattern) => pattern.test(corpus));

  return panel(
    8,
    'Scrub audit (loaded content)',
    'Shipped check packs and fixtures carry no internal document or certificate identifiers. ' +
      'The authoritative scan is the pre-commit hook and the CI job over full history.',
    [
      {
        label: 'Structural patterns in loaded content',
        passed: hits.length === 0,
        detail: hits.length === 0 ? 'no matches' : `${hits.length} pattern(s) matched`,
      },
    ]
  );
}

// --- 9 ----------------------------------------------------------------------
export async function panelRetention(): Promise<PanelResult> {
  const atDefault = evaluateRetention({
    configuredYears: PRODUCT_DEFAULT_RETENTION_YEARS,
    basis: 'faa-part-145',
  });
  const below = evaluateRetention({ configuredYears: 1, basis: 'faa-part-145' });

  const graph = new FakeGraphClient();
  graph.retentionLabel = { name: 'Maintenance records', retentionDuration: { days: 3650 } };
  const { readRetentionLabelYears } = await import('../storage/sharepoint');
  const label = await readRetentionLabelYears(graph, 'drive-1');

  return panel(
    9,
    'Retention check',
    'Configured retention is never below the regulatory floor, and the library label is read back.',
    [
      {
        label: 'Product default vs floor',
        passed: atDefault.acceptable,
        detail: atDefault.message,
      },
      { label: 'Below floor is refused', passed: !below.acceptable, detail: below.message },
      {
        label: 'Library retention label read back',
        passed: label?.years === 10,
        detail: label === null ? 'no label' : `${label.label}: ${label.years ?? 'unknown'} years`,
      },
      {
        label: 'Floors marked unverified',
        passed: !atDefault.floorVerified,
        detail: 'floors ship unverified pending confirmation against controlled copies',
      },
    ]
  );
}

// --- 10 ---------------------------------------------------------------------
export async function panelAdapterConformance(): Promise<PanelResult> {
  const adapters: { name: string; factory: (() => StorageProvider) | null }[] = [
    { name: 'memory', factory: () => new MemoryStorageProvider() },
    {
      name: 'sharepoint',
      factory: () =>
        new SharePointStorageProvider(new FakeGraphClient(), {
          driveId: 'drive-1',
          folderTemplate: '/{year}/{supplier}/{receipt-id}/',
        }),
    },
    { name: 'webdav (stub)', factory: () => new WebDavStorageProvider() },
    { name: 's3 (stub)', factory: () => new S3StorageProvider() },
  ];

  const rows: PanelRow[] = [];
  for (const adapter of adapters) {
    if (adapter.factory === null) continue;
    const results = await runProviderContract(adapter.factory);
    const failed = results.filter((r) => !r.passed);
    const isStub = adapter.name.includes('stub');
    rows.push({
      label: adapter.name,
      /* A stub is EXPECTED to fail every operation. Reporting it green would
         be the lie; reporting it red as if broken would be noise. */
      passed: isStub ? failed.length === results.length : failed.length === 0,
      detail: isStub
        ? `stub — ${failed.length}/${results.length} operations correctly unimplemented`
        : `${results.length - failed.length}/${results.length} operations pass` +
          (failed.length > 0 ? `: ${failed.map((f) => f.operation).join(', ')}` : ''),
    });
  }

  return panel(
    10,
    'Storage adapter conformance',
    'Every adapter runs the same contract. Passing it is what makes a provider valid, ' +
      'so a customer can bring their own.',
    rows
  );
}

// --- 11 ---------------------------------------------------------------------
export async function panelOfflineCommit(): Promise<PanelResult> {
  const upstream = new MemoryStorageProvider();
  let online = false;

  const gated: StorageProvider = {
    name: 'gated',
    put: async (key, body, options) => {
      if (!online) throw new Error('network unavailable');
      return upstream.put(key, body, options);
    },
    get: (key) => upstream.get(key),
    list: (prefix) => upstream.list(prefix),
    lock: (key, holder, ttl, now) => upstream.lock(key, holder, ttl, now),
    unlock: (key, holder, now) => upstream.unlock(key, holder, now),
    peekLock: (key, now) => upstream.peekLock(key, now),
    history: (key) => upstream.history(key),
  };

  const queue = new SyncQueue(gated, new MemoryQueueStore());
  const record = signed(completeRecord());
  if (!record.ok) {
    return panel(11, 'Offline → commit', 'A record survives a dropped network.', [
      { label: 'Build record', passed: false, detail: record.reasons.join('; ') },
    ]);
  }

  await queue.enqueue({
    id: 'offline-1',
    key: `records/${record.record.id}.json`,
    body: JSON.stringify(record.record),
    contentType: 'application/json',
    metadata: recordMetadata(record.record),
    now: NOW,
  });

  const offlineFlush = await queue.flush(NOW);
  const depthOffline = await queue.depth();

  online = true;
  const onlineFlush = await queue.flush(NOW);
  const depthOnline = await queue.depth();
  const upstreamCopy = await upstream.get(`records/${record.record.id}.json`);
  const history = await upstream.history(`records/${record.record.id}.json`);

  return panel(
    11,
    'Offline → commit',
    'A record signed offline commits intact and EXACTLY ONCE when the network returns. ' +
      'A record lost to a dropped connection is the failure mode that kills this product.',
    [
      {
        label: 'Sign and queue while offline',
        passed: offlineFlush.failed.length === 1 && depthOffline === 1,
        detail: 'commit failed, record retained in the queue with the error recorded',
      },
      {
        label: 'Commit on reconnect',
        passed: onlineFlush.committed.length === 1 && depthOnline === 0,
        detail: 'queue drained',
      },
      {
        label: 'Record intact',
        passed: JSON.parse(upstreamCopy.body).id === record.record.id,
        detail: `${upstreamCopy.body.length} bytes upstream`,
      },
      {
        label: 'Committed exactly once',
        passed: history.length === 1,
        detail: `${history.length} revision(s) upstream — a retry must not double-write`,
      },
    ]
  );
}

// --- 12 ---------------------------------------------------------------------
export async function panelConcurrency(): Promise<PanelResult> {
  const store = new MemoryStorageProvider();
  const rows: PanelRow[] = [];

  await store.lock('RCPT-0001', 'tablet-a', 30, NOW);
  try {
    await store.lock('RCPT-0001', 'tablet-b', 30, '2026-07-24T10:05:00.000Z');
    rows.push({ label: 'Second device blocked', passed: false, detail: 'BOTH ACQUIRED — defect' });
  } catch (error) {
    const held = error instanceof LockHeldError;
    rows.push({
      label: 'Second device blocked',
      passed: held,
      detail: held ? (error as LockHeldError).message : String(error),
    });
  }

  const afterExpiry = await store.lock('RCPT-0001', 'tablet-b', 30, '2026-07-24T11:30:00.000Z');
  rows.push({
    label: 'Lock expiry releases a dead tablet',
    passed: afterExpiry.holder === 'tablet-b',
    detail: 'a dead device cannot block the receiving dock indefinitely',
  });

  return panel(
    12,
    'Concurrency test',
    'The same receipt cannot be inspected on two devices, and the holder is named.',
    rows
  );
}

// --- 13 ---------------------------------------------------------------------
export function panelRoleMatrix(): PanelResult {
  const roles: Role[] = ['inspector', 'supervisor', 'quality-manager', 'read-only'];
  const rows: PanelRow[] = roles.map((role) => {
    const caps = capabilitiesFor(role);
    return {
      label: role,
      passed: true,
      detail: Object.entries(caps)
        .map(([k, v]) => `${k}=${v ? 'yes' : 'no'}`)
        .join('  '),
    };
  });

  rows.push({
    label: 'Read-only cannot sign',
    passed: !capabilitiesFor('read-only').canSignRecord,
    detail: 'the audit role changes nothing',
  });
  rows.push({
    label: 'Inspector cannot approve a supervisor disposition',
    passed: !canPerform('inspector', 'supervisor'),
    detail: 'capability is enforced by rank, not by screen',
  });

  return panel(13, 'Role capability matrix', 'Capabilities are enforced per mapped role.', rows);
}

// --- 14 ---------------------------------------------------------------------
export function panelSharePointMapping(): PanelResult {
  const outcome = signed(completeRecord());
  if (!outcome.ok) {
    return panel(14, 'SharePoint metadata mapping', 'Library columns are known before rollout.', [
      { label: 'Build record', passed: false, detail: outcome.reasons.join('; ') },
    ]);
  }

  const metadata = recordMetadata(outcome.record);
  const rows = Object.entries(metadata).map(([column, value]) => ({
    label: column,
    passed: true,
    detail: value === '' ? '(empty)' : value,
  }));

  return panel(
    14,
    'SharePoint metadata mapping',
    'These are the library columns the app writes, so views and reports can be confirmed ' +
      'before rollout rather than after.',
    rows
  );
}

export async function runAllPanels(): Promise<PanelResult[]> {
  return [
    panelScenarioRunner(),
    panelPathRouterInspector(),
    panelDeterminism(),
    panelImmutability(),
    panelNcrTracer(),
    panelCalibrationGate(),
    panelDocumentPreview().result,
    panelScrubAudit(),
    await panelRetention(),
    await panelAdapterConformance(),
    await panelOfflineCommit(),
    await panelConcurrency(),
    panelRoleMatrix(),
    panelSharePointMapping(),
  ];
}
