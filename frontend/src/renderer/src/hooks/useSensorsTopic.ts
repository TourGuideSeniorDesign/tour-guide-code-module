import { useEffect, useState } from "react";
import ROSLIB from "roslib";
import type { AutogiroInterfacesSensors } from "../types/ros";

export function useSensorsTopic(
  ros: ROSLIB.Ros | null,
): AutogiroInterfacesSensors | null {
  const [sensors, setSensors] = useState<AutogiroInterfacesSensors | null>(
    null,
  );

  useEffect(() => {
    if (!ros) {
      setSensors(null);
      return;
    }

    const topic = new ROSLIB.Topic({
      ros,
      name: "sensors",
      messageType: "autogiro_interfaces/msg/Sensors",
      queue_size: 1,
    });

    topic.subscribe((message) => {
      setSensors(message as unknown as AutogiroInterfacesSensors);
    });

    return () => {
      topic.unsubscribe();
    };
  }, [ros]);

  return sensors;
}
