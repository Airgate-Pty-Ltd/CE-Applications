import { z } from 'zod';

/**
 * A measuring tool and its calibration state.
 *
 * Any check requiring a measurement records the tool and its next calibration
 * due date. If the tool is out of calibration the app BLOCKS the check. Using
 * an out-of-calibration tool is a common audit finding, and blocking it in
 * software rather than warning about it is a selling point.
 */
export const measuringTool = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  /** ISO date. Compared against an explicitly passed evaluation date — the
   *  engine never reads the clock, so a determination is reproducible. */
  calibrationDueDate: z.string().date(),
  /** Set when the tool is withdrawn from service for any other reason. */
  outOfService: z.boolean().default(false),
});
export type MeasuringTool = z.infer<typeof measuringTool>;

export const calibrationBlockCode = z.enum([
  'TOOL_CALIBRATION_EXPIRED',
  'TOOL_OUT_OF_SERVICE',
  'TOOL_NOT_IDENTIFIED',
]);
export type CalibrationBlockCode = z.infer<typeof calibrationBlockCode>;

export const calibrationVerdict = z.object({
  allowed: z.boolean(),
  code: calibrationBlockCode.nullable(),
  /** Shown to the inspector. States why, never merely that. */
  message: z.string().min(1),
  toolId: z.string().min(1).nullable(),
  calibrationDueDate: z.string().date().nullable(),
});
export type CalibrationVerdict = z.infer<typeof calibrationVerdict>;
