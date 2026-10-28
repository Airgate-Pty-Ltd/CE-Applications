import type { SessionRole } from '../schema/roster.ts'

/**
 * The video provider adapter.
 *
 * No media server is built in v1. A provider sits behind this interface so it
 * can be swapped - an acquirer may have their own, and no provider has been
 * selected yet.
 *
 * Read what is *not* here: there is no import, upload, attach or ingest method.
 * That absence is the enforcement of the live-only control. A file cannot become
 * conformity evidence because there is no path for one to arrive on.
 *
 * The interface is deliberately narrow. Everything the record needs from the
 * provider is a measurement, a degradation signal, and a durable artefact
 * reference with a content hash. Anything richer would start pulling evidence
 * into the vendor's shape, which is the failure mode DESIGN-NOTES.md calls
 * drift.
 */

export interface StreamMeasurement {
  widthPx: number
  heightPx: number
  framesPerSecond: number
  measuredAt: string
}

export interface DegradationEvent {
  at: string
  category: 'STREAM_FAILURE' | 'EQUIPMENT_FAILURE' | 'DEGRADATION'
  reason: string
}

/** What the provider hands back when recording stops. Both fields land on the record. */
export interface RecordingArtefact {
  artefactRef: string
  contentHash: string
  startedAt: string
  endedAt: string
}

export interface JoinRequest {
  sessionId: string
  personId: string
  role: SessionRole
}

export interface VideoProvider {
  readonly providerId: string

  join(request: JoinRequest): Promise<void>
  leave(): Promise<void>

  /** Measured from the live stream, never asked of the user. */
  measureStream(): Promise<StreamMeasurement>

  /**
   * Recording is mandatory. Start failure and stop failure are both reported by
   * rejection, and the caller turns that into RECORDING_FAILED.
   */
  startRecording(storageTargetRef: string): Promise<void>
  stopRecording(): Promise<RecordingArtefact>

  /** Returns an unsubscribe function. */
  onDegradation(listener: (event: DegradationEvent) => void): () => void
}

export class RecordingFailure extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'RecordingFailure'
  }
}
