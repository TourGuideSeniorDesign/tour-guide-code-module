import { useState, useEffect } from 'react'
import ROSLIB from 'roslib'
import type { AutogiroInterfacesRefSpeed } from '../types/ros'

export function useRefSpeedTopic(ros: ROSLIB.Ros | null): AutogiroInterfacesRefSpeed | null {
  const [refSpeed, setRefSpeed] = useState<AutogiroInterfacesRefSpeed | null>(null)

  useEffect(() => {
    if (!ros) {
      setRefSpeed(null)
      return
    }

    const topic = new ROSLIB.Topic({
      ros,
      name: '/ref_speed',
      messageType: 'autogiro_interfaces/msg/RefSpeed',
      queue_size: 1
    })

    topic.subscribe((message) => {
      setRefSpeed(message as unknown as AutogiroInterfacesRefSpeed)
    })

    return () => {
      topic.unsubscribe()
    }
  }, [ros])

  return refSpeed
}
