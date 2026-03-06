import { useEffect, useState } from "react";
import ROSLIB from "roslib";
import type { AutogiroInterfacesFanSpeed } from "../types/ros";

export function useFanSpeedTopic(
  ros: ROSLIB.Ros | null,
): AutogiroInterfacesFanSpeed | null {
  const [fanSpeed, setFanSpeed] = useState<AutogiroInterfacesFanSpeed | null>(
    null,
  );

  useEffect(() => {
    if (!ros) {
      setFanSpeed(null);
      return;
    }

    const topic = new ROSLIB.Topic({
      ros,
      name: "/fan_speed",
      messageType: "autogiro_interfaces/msg/FanSpeed",
      queue_size: 1,
    });

    topic.subscribe((message) => {
      setFanSpeed(message as unknown as AutogiroInterfacesFanSpeed);
    });

    return () => {
      topic.unsubscribe();
    };
  }, [ros]);

  return fanSpeed;
}
