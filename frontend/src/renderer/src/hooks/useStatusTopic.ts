import { useState, useEffect } from 'react'
import ROSLIB from 'roslib'
import { StatusMessage } from '../types/ros'

export function useStatusTopic(ros: ROSLIB.Ros | null): StatusMessage | null {
  const [status, setStatus] = useState<StatusMessage | null>(null)

  useEffect(() => {
    if (!ros) {
      setStatus(null)
      return
    }

    const topic = new ROSLIB.Topic({
      ros,
      name: '/status',
      messageType: 'autogiro_interfaces/msg/Status',
      queue_size: 1
    })

    topic.subscribe((message) => {
      setStatus(message as unknown as StatusMessage)
    })

    return () => {
      topic.unsubscribe()
    }
  }, [ros])

  return status
}
