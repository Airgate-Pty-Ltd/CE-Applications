import { describe, it, expect } from 'vitest';
import { evaluateToolGate } from './calibration';
import type { MeasuringTool } from '../schema/tool';

const tool = (overrides: Partial<MeasuringTool> = {}): MeasuringTool => ({
  id: 'TOOL-001',
  description: 'Digital calliper',
  calibrationDueDate: '2026-12-31',
  outOfService: false,
  ...overrides,
});

const TODAY = '2026-07-24';

describe('tool and calibration gate', () => {
  it('engages no tool when the check requires no measurement', () => {
    const verdict = evaluateToolGate({
      requiresMeasurement: false,
      tool: null,
      evaluationDate: TODAY,
    });

    expect(verdict.allowed).toBe(true);
    expect(verdict.code).toBeNull();
    expect(verdict.toolId).toBeNull();
  });

  it('blocks a measurement check with no tool identified', () => {
    const verdict = evaluateToolGate({
      requiresMeasurement: true,
      tool: null,
      evaluationDate: TODAY,
    });

    expect(verdict.allowed).toBe(false);
    expect(verdict.code).toBe('TOOL_NOT_IDENTIFIED');
  });

  it('blocks a tool withdrawn from service', () => {
    const verdict = evaluateToolGate({
      requiresMeasurement: true,
      tool: tool({ outOfService: true }),
      evaluationDate: TODAY,
    });

    expect(verdict.allowed).toBe(false);
    expect(verdict.code).toBe('TOOL_OUT_OF_SERVICE');
    expect(verdict.toolId).toBe('TOOL-001');
  });

  it('blocks an out-of-calibration tool and states why, not merely that', () => {
    const verdict = evaluateToolGate({
      requiresMeasurement: true,
      tool: tool({ calibrationDueDate: '2026-07-23' }),
      evaluationDate: TODAY,
    });

    expect(verdict.allowed).toBe(false);
    expect(verdict.code).toBe('TOOL_CALIBRATION_EXPIRED');
    expect(verdict.message).toContain('2026-07-23');
    expect(verdict.message).toContain(TODAY);
  });

  it('allows a tool due today — the due date is the last valid day', () => {
    const verdict = evaluateToolGate({
      requiresMeasurement: true,
      tool: tool({ calibrationDueDate: TODAY }),
      evaluationDate: TODAY,
    });

    expect(verdict.allowed).toBe(true);
    expect(verdict.code).toBeNull();
  });

  it('allows a tool in calibration', () => {
    const verdict = evaluateToolGate({
      requiresMeasurement: true,
      tool: tool(),
      evaluationDate: TODAY,
    });

    expect(verdict.allowed).toBe(true);
    expect(verdict.calibrationDueDate).toBe('2026-12-31');
  });
});
