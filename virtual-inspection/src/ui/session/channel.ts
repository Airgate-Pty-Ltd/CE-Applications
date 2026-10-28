import type { SessionState } from '../../schema/session.ts'

/**
 * The one-way link from the inspector surface to the presenter surface.
 *
 * One way, deliberately. The inspector broadcasts the current instruction and
 * session state; the presenter sends back only a problem flag. There is no
 * message on this channel that could carry a determination, because the
 * presenter has no capability to make one and a channel is exactly the kind of
 * back door through which one would otherwise arrive.
 */

export interface PresenterBroadcast {
  kind: 'presenter-brief'
  sessionState: SessionState
  /** The instruction to show in large type. One at a time. */
  instruction: string | null
  checkTitle: string | null
  checkNumber: number | null
  checkCount: number
  /** Set when the inspector is waiting on a specific manipulation. */
  awaitingAction: boolean
}

export interface PresenterFlag {
  kind: 'presenter-flag'
  at: string
  note: string
}

export type SessionMessage = PresenterBroadcast | PresenterFlag

const CHANNEL_NAME = 'remote-inspection-session'

export function openSessionChannel(
  onMessage: (message: SessionMessage) => void,
): { post: (message: SessionMessage) => void; close: () => void } {
  if (typeof BroadcastChannel === 'undefined') {
    return { post: () => undefined, close: () => undefined }
  }
  const channel = new BroadcastChannel(CHANNEL_NAME)
  channel.onmessage = (event: MessageEvent<SessionMessage>) => onMessage(event.data)
  return {
    post: (message) => channel.postMessage(message),
    close: () => channel.close(),
  }
}
