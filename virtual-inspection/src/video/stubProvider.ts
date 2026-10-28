import { contentHash } from '../engine/hash.ts'
import {
  RecordingFailure,
  type DegradationEvent,
  type JoinRequest,
  type RecordingArtefact,
  type StreamMeasurement,
  type VideoProvider,
} from './provider.ts'

/**
 * A scripted provider for development, tests and the test dashboard.
 *
 * Deterministic by construction: every value it returns is either configured or
 * derived from configured values, so a scenario driven through it produces the
 * same record every time. It exists so the engine, the UI and the dashboard can
 * be exercised before a provider is chosen - and so that choosing one later is a
 * change in one file.
 */

export interface StubProviderOptions {
  providerId?: string
  heightPx?: number
  widthPx?: number
  framesPerSecond?: number
  /** Fixed clock. The stub never reads the wall clock. */
  now?: string
  /** Make stopRecording reject, to drive the RECORDING_FAILED path. */
  failRecording?: boolean
  artefactRef?: string
}

export class StubVideoProvider implements VideoProvider {
  readonly providerId: string

  private readonly options: Required<Omit<StubProviderOptions, 'providerId'>>
  private readonly listeners = new Set<(event: DegradationEvent) => void>()
  private joined: JoinRequest | null = null
  private recordingStartedAt: string | null = null

  constructor(options: StubProviderOptions = {}) {
    this.providerId = options.providerId ?? 'stub'
    this.options = {
      heightPx: options.heightPx ?? 1080,
      widthPx: options.widthPx ?? 1920,
      framesPerSecond: options.framesPerSecond ?? 30,
      now: options.now ?? '2026-07-24T15:00:00.000Z',
      failRecording: options.failRecording ?? false,
      artefactRef: options.artefactRef ?? 'customer-store://sessions/stub.mkv',
    }
  }

  async join(request: JoinRequest): Promise<void> {
    this.joined = request
  }

  async leave(): Promise<void> {
    this.joined = null
    this.listeners.clear()
  }

  async measureStream(): Promise<StreamMeasurement> {
    return {
      widthPx: this.options.widthPx,
      heightPx: this.options.heightPx,
      framesPerSecond: this.options.framesPerSecond,
      measuredAt: this.options.now,
    }
  }

  async startRecording(storageTargetRef: string): Promise<void> {
    if (!this.joined) throw new RecordingFailure('cannot record before joining the session')
    if (!storageTargetRef) throw new RecordingFailure('no customer storage target configured')
    this.recordingStartedAt = this.options.now
  }

  async stopRecording(): Promise<RecordingArtefact> {
    if (this.options.failRecording) {
      throw new RecordingFailure('storage target rejected the artefact write at session end')
    }
    if (!this.recordingStartedAt) throw new RecordingFailure('recording was never started')
    return {
      artefactRef: this.options.artefactRef,
      contentHash: contentHash({ artefactRef: this.options.artefactRef, startedAt: this.recordingStartedAt }),
      startedAt: this.recordingStartedAt,
      endedAt: this.options.now,
    }
  }

  onDegradation(listener: (event: DegradationEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Test and dashboard affordance: drive a degradation through the real path. */
  emitDegradation(event: DegradationEvent): void {
    for (const listener of this.listeners) listener(event)
  }
}
