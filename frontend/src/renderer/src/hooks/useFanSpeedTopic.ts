import { useState, useEffect } from 'react'
import ROSLIB from 'roslib'
import { FanSpeedMessage } from '../types/ros'

export function useFanSpeedTopic(ros: ROSLIB.Ros | null): FanSpeedMessage | null {
  const [fanSpeed, setFanSpeed] = useState<FanSpeedMessage | null>(null)

  useEffect(() => {
    if (!ros) {
      setFanSpeed(null)
      return
    }

    const topic = new ROSLIB.Topic({
      ros,
      name: '/fan_speed',
      messageType: 'autogiro_interfaces/msg/FanSpeed',
      queue_size: 1
    })

    topic.subscribe((message) => {
      setFanSpeed(message as unknown as FanSpeedMessage)
    })

    return () => {
      topic.unsubscribe()
    }
  }, [ros])

  return fanSpeed
}
