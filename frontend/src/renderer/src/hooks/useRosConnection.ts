import { useState, useEffect, useRef, useCallback } from 'react'
import ROSLIB from 'roslib'
import { RosConnectionState } from '../types/ros'

export interface RosConnectionResult {
  ros: ROSLIB.Ros | null
  connectionState: RosConnectionState
  connect: (url: string) => void
  disconnect: () => void
}

export function useRosConnection(): RosConnectionResult {
  const [ros, setRos] = useState<ROSLIB.Ros | null>(null)
  const [connectionState, setConnectionState] = useState<RosConnectionState>('disconnected')
  const rosRef = useRef<ROSLIB.Ros | null>(null)

  const disconnect = useCallback(() => {
    if (rosRef.current) {
      rosRef.current.close()
      rosRef.current = null
      setRos(null)
      setConnectionState('disconnected')
    }
  }, [])

  const connect = useCallback(
    (url: string) => {
      disconnect()

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
    },
    [disconnect]
  )

  useEffect(() => {
    return () => {
      rosRef.current?.close()
    }
  }, [])

  return { ros, connectionState, connect, disconnect }
}
