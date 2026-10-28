import { useCallback, useEffect, useRef } from 'react'
import { openSessionChannel, type SessionMessage } from './channel.ts'

/**
 * Own the session channel for the lifetime of a mounted component.
 *
 * The channel must be created inside an effect rather than in a memo. React
 * mounts, cleans up and re-mounts in development, so a memoised channel gets
 * closed by the first cleanup and every later post throws on a closed
 * BroadcastChannel - which takes the whole surface down with it.
 *
 * The returned `post` is stable and silently does nothing while no channel is
 * open. Dropping a presenter brief because the component is unmounting is
 * correct; throwing is not.
 */
export function useSessionChannel(onMessage: (message: SessionMessage) => void): (message: SessionMessage) => void {
  const handler = useRef(onMessage)
  handler.current = onMessage

  const channel = useRef<ReturnType<typeof openSessionChannel> | null>(null)

  useEffect(() => {
    const open = openSessionChannel((message) => handler.current(message))
    channel.current = open
    return () => {
      channel.current = null
      open.close()
    }
  }, [])

  return useCallback((message: SessionMessage) => {
    channel.current?.post(message)
  }, [])
}
