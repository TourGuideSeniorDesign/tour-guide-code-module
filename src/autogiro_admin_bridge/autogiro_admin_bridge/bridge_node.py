"""Read-only HTTP bridge from ROS 2 to the remote-management dashboard.

Subscribes to a fixed set of topics (battery_status, motor_speed,
sensors), caches the most recent message per topic in memory, and
serves a JSON snapshot at GET http://127.0.0.1:9100/state. The Next.js
admin app proxies that endpoint into /api/ros.

This node is strictly read-only: no publishers, no service clients,
no parameter writes that affect other nodes. Adding publish capability
should be an explicit, reviewed change.
"""

import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import rclpy
from rclpy.node import Node
from rclpy.qos import (
    QoSDurabilityPolicy,
    QoSHistoryPolicy,
    QoSProfile,
    QoSReliabilityPolicy,
)

from autogiro_interfaces.msg import Battery, Motors, Sensors

HOST = os.environ.get("ROS_BRIDGE_HOST", "127.0.0.1")
PORT = int(os.environ.get("ROS_BRIDGE_PORT", "9100"))

# Matches autogiro.qos_profiles.MONITORING — best-effort, depth 1.
# Duplicated here to avoid a cross-package import.
MONITORING = QoSProfile(
    reliability=QoSReliabilityPolicy.BEST_EFFORT,
    history=QoSHistoryPolicy.KEEP_LAST,
    depth=1,
    durability=QoSDurabilityPolicy.VOLATILE,
)


def _battery_to_dict(msg: Battery) -> dict[str, Any]:
    return {
        "voltage": float(msg.voltage),
        "current_amps": float(msg.current_amps),
        "consumed_ah": float(msg.consumed_ah),
        "battery_percent": float(msg.battery_percent),
    }


def _motors_to_dict(msg: Motors) -> dict[str, Any]:
    return {
        "left_mph": float(msg.left_mph),
        "right_mph": float(msg.right_mph),
    }


def _sensors_to_dict(msg: Sensors) -> dict[str, Any]:
    return {
        "lat_disp": int(msg.lat_disp),
        "long_disp": int(msg.long_disp),
        "left_speed": int(msg.left_speed),
        "right_speed": int(msg.right_speed),
        "ultrasonic_front_0": int(msg.ultrasonic_front_0),
        "ultrasonic_front_1": int(msg.ultrasonic_front_1),
        "ultrasonic_back": int(msg.ultrasonic_back),
        "ultrasonic_left": int(msg.ultrasonic_left),
        "ultrasonic_right": int(msg.ultrasonic_right),
        "pir_front": bool(msg.pir_front),
        "pir_back": bool(msg.pir_back),
        "pir_left": bool(msg.pir_left),
        "pir_right": bool(msg.pir_right),
        "fan_speed_0": int(msg.fan_speed_0),
        "fan_speed_1": int(msg.fan_speed_1),
        "fan_speed_2": int(msg.fan_speed_2),
        "fan_speed_3": int(msg.fan_speed_3),
        "linear_acceleration": {
            "x": float(msg.linear_acceleration_x),
            "y": float(msg.linear_acceleration_y),
            "z": float(msg.linear_acceleration_z),
        },
        "angular_velocity": {
            "x": float(msg.angular_velocity_x),
            "y": float(msg.angular_velocity_y),
            "z": float(msg.angular_velocity_z),
        },
        "magnetic_field": {
            "x": float(msg.magnetic_field_x),
            "y": float(msg.magnetic_field_y),
            "z": float(msg.magnetic_field_z),
        },
    }


class BridgeNode(Node):
    def __init__(self) -> None:
        super().__init__("autogiro_admin_bridge")
        self._lock = threading.Lock()
        self._state: dict[str, dict[str, Any]] = {}

        self.create_subscription(Battery, "battery_status", self._on_battery, MONITORING)
        self.create_subscription(Motors, "motor_speed", self._on_motors, MONITORING)
        self.create_subscription(Sensors, "sensors", self._on_sensors, MONITORING)

    def _store(self, key: str, payload: dict[str, Any]) -> None:
        payload["received_at"] = time.time()
        with self._lock:
            self._state[key] = payload

    def _on_battery(self, msg: Battery) -> None:
        self._store("battery", _battery_to_dict(msg))

    def _on_motors(self, msg: Motors) -> None:
        self._store("motor_speed", _motors_to_dict(msg))

    def _on_sensors(self, msg: Sensors) -> None:
        self._store("sensors", _sensors_to_dict(msg))

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return {"topics": dict(self._state), "server_time": time.time()}


def _make_handler(node: BridgeNode):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            if self.path != "/state":
                self.send_error(404)
                return
            body = json.dumps(node.snapshot()).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, fmt: str, *args: Any) -> None:
            return

    return Handler


def main(args=None) -> None:
    rclpy.init(args=args)
    node = BridgeNode()
    server = ThreadingHTTPServer((HOST, PORT), _make_handler(node))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    node.get_logger().info(
        f"autogiro_admin_bridge listening on http://{HOST}:{PORT}/state"
    )
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        server.shutdown()
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
