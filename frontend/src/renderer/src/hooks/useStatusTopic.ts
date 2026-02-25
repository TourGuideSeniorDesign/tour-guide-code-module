import { useState, useEffect } from 'react'
import ROSLIB from 'roslib'
import { AutogiroInterfacesStatus } from '../types/ros'

export function useStatusTopic(ros: ROSLIB.Ros | null): AutogiroInterfacesStatus | null {
  const [status, setStatus] = useState<AutogiroInterfacesStatus | null>(null)

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
      setStatus(message as unknown as AutogiroInterfacesStatus)
    })

    return () => {
      topic.unsubscribe()
    }
  }, [ros])

  return status
}
