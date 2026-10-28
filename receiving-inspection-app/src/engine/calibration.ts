import type { MeasuringTool, CalibrationVerdict } from '../schema/tool';

/**
 * Tool and calibration gate.
 *
 * A check requiring a measurement is BLOCKED when the tool is out of
 * calibration. Not warned about — blocked. Using an out-of-calibration tool is
 * a common audit finding, and a product that merely records the tool number
 * has done nothing to prevent it.
 *
 * Pure: the evaluation date is passed in, never read from the clock, so the
 * same check on the same day always yields the same verdict.
 */

export interface ToolGateInput {
  /** True where answering the check requires a measurement. */
  readonly requiresMeasurement: boolean;
  /** The tool the inspector selected. Null when none has been selected. */
  readonly tool: MeasuringTool | null;
  /** ISO date (YYYY-MM-DD) the check is being performed on. */
  readonly evaluationDate: string;
}

export function evaluateToolGate(input: ToolGateInput): CalibrationVerdict {
  const { requiresMeasurement, tool, evaluationDate } = input;

  if (!requiresMeasurement) {
    return {
      allowed: true,
      code: null,
      message: 'This check requires no measurement, so no tool is engaged.',
      toolId: null,
      calibrationDueDate: null,
    };
  }

  if (tool === null) {
    return {
      allowed: false,
      code: 'TOOL_NOT_IDENTIFIED',
      message:
        'This check requires a measurement. Identify the tool used before recording a result.',
      toolId: null,
      calibrationDueDate: null,
    };
  }

  if (tool.outOfService) {
    return {
      allowed: false,
      code: 'TOOL_OUT_OF_SERVICE',
      message: `Tool ${tool.id} is withdrawn from service and cannot be used to record a result.`,
      toolId: tool.id,
      calibrationDueDate: tool.calibrationDueDate,
    };
  }

  /* ISO dates compare correctly as strings. A tool due today is still in
     calibration today — the due date is the last valid day, not the first
     invalid one. */
  if (tool.calibrationDueDate < evaluationDate) {
    return {
      allowed: false,
      code: 'TOOL_CALIBRATION_EXPIRED',
      message:
        `Tool ${tool.id} is out of calibration: due ${tool.calibrationDueDate}, ` +
        `today is ${evaluationDate}. This check is blocked until a calibrated tool is used.`,
      toolId: tool.id,
      calibrationDueDate: tool.calibrationDueDate,
    };
  }

  return {
    allowed: true,
    code: null,
    message: `Tool ${tool.id} is in calibration until ${tool.calibrationDueDate}.`,
    toolId: tool.id,
    calibrationDueDate: tool.calibrationDueDate,
  };
}
