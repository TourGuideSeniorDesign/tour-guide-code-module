import { useState, useEffect, useRef, useCallback } from 'react'
import ROSLIB from 'roslib'
import { RosConnectionState } from '../types/ros'

const DEFAULT_URL = 'ws://localhost:9090'
const RETRY_SECONDS = 10

export interface RosConnectionResult {
  ros: ROSLIB.Ros | null
  connectionState: RosConnectionState
  /** Seconds remaining until next auto-connect attempt, or null when not counting down */
  retryCountdown: number | null
  connect: (url: string) => void
  disconnect: () => void
}

export function useRosConnection(): RosConnectionResult {
  const [ros, setRos] = useState<ROSLIB.Ros | null>(null)
  const [connectionState, setConnectionState] = useState<RosConnectionState>('disconnected')
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null)
  const rosRef = useRef<ROSLIB.Ros | null>(null)
  const urlRef = useRef<string>(DEFAULT_URL)
  const autoConnectRef = useRef<boolean>(true)

  const connect = useCallback((url: string) => {
    urlRef.current = url
    autoConnectRef.current = true

    if (rosRef.current) {
      rosRef.current.close()
      rosRef.current = null
      setRos(null)
    }

    setRetryCountdown(null)
    setConnectionState('connecting')

    const instance = new ROSLIB.Ros({ url })

    instance.on('connection', () => {
      setConnectionState('connected')
      setRos(instance)
    })

    instance.on('error', () => {
      setConnectionState('error')
      setRos(null)
    })

    instance.on('close', () => {
      setConnectionState('disconnected')
      setRos(null)
    })

    rosRef.current = instance
  }, [])

  const disconnect = useCallback(() => {
    autoConnectRef.current = false
    setRetryCountdown(null)
    if (rosRef.current) {
      rosRef.current.close()
      rosRef.current = null
      setRos(null)
      setConnectionState('disconnected')
    }
  }, [])

  const connectRef = useRef(connect)
  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  // Initial auto-connect on mount
  useEffect(() => {
    connectRef.current(urlRef.current)
    return () => {
      rosRef.current?.close()
    }
  }, [])

  // Start a countdown whenever state becomes disconnected/error with auto-connect enabled
  useEffect(() => {
    if (!autoConnectRef.current) return
    if (connectionState !== 'disconnected' && connectionState !== 'error') return

    setRetryCountdown(RETRY_SECONDS)

    const tick = setInterval(() => {
      setRetryCountdown((prev) => (prev !== null && prev > 1 ? prev - 1 : null))
    }, 1000)

    const retry = setTimeout(() => {
      if (autoConnectRef.current) {
        connectRef.current(urlRef.current)
      }
    }, RETRY_SECONDS * 1000)

    return () => {
      clearInterval(tick)
      clearTimeout(retry)
    }
  }, [connectionState])

  return { ros, connectionState, retryCountdown, connect, disconnect }
}
