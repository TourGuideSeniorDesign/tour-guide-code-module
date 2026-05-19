import time
from math import atan2, hypot, pi

import rclpy
from rcl_interfaces.msg import SetParametersResult
from rclpy.node import Node

from autogiro.qos_profiles import CONTROL, MONITORING
from autogiro_interfaces.msg import RefSpeed, Sensors


class JoystickControl(Node):
    def __init__(self):
        super().__init__('joystick_control')

        self.declare_parameter('enabled', False)
        self.declare_parameter('max_speed', 1.0)
        self.declare_parameter('deadzone', 0.15)
        self.declare_parameter('diff_threshold', 0.1)
        self.declare_parameter('backward_x_threshold', 0.2)
        self.declare_parameter('sensor_timeout_sec', 0.5)

        self.enabled = bool(self.get_parameter('enabled').value)
        self.max_speed = max(
            0.0, min(1.0, float(self.get_parameter('max_speed').value))
        )
        self.deadzone = max(
            0.0, min(1.0, float(self.get_parameter('deadzone').value))
        )
        self.diff_threshold = max(
            0.0, float(self.get_parameter('diff_threshold').value)
        )
        self.backward_x_threshold = max(
            0.0, min(1.0, float(self.get_parameter('backward_x_threshold').value))
        )
        self.sensor_timeout_sec = max(
            0.1, float(self.get_parameter('sensor_timeout_sec').value)
        )

        self.last_sensor_time = None
        self.zero_published = False

        self.publisher = self.create_publisher(RefSpeed, 'ref_speed', CONTROL)
        self.subscription = self.create_subscription(
            Sensors,
            'sensors',
            self.sensor_callback,
            MONITORING,
        )
        self.watchdog_timer = self.create_timer(0.1, self.watchdog_callback)
        self.add_on_set_parameters_callback(self.parameters_callback)

        self.get_logger().info(
            'Joystick control ready. Set enabled:=true to publish ref_speed.'
        )

    def parameters_callback(self, parameters):
        was_enabled = self.enabled

        for parameter in parameters:
            if parameter.name == 'enabled':
                self.enabled = bool(parameter.value)
            elif parameter.name == 'deadzone':
                self.deadzone = max(0.0, min(1.0, float(parameter.value)))
            elif parameter.name == 'max_speed':
                self.max_speed = max(0.0, min(1.0, float(parameter.value)))
            elif parameter.name == 'diff_threshold':
                self.diff_threshold = max(0.0, float(parameter.value))
            elif parameter.name == 'backward_x_threshold':
                self.backward_x_threshold = max(
                    0.0, min(1.0, float(parameter.value))
                )
            elif parameter.name == 'sensor_timeout_sec':
                self.sensor_timeout_sec = max(0.1, float(parameter.value))

        if was_enabled and not self.enabled:
            self.publish_zero()

        return SetParametersResult(successful=True)

    def sensor_callback(self, msg):
        self.last_sensor_time = time.monotonic()

        if not self.enabled:
            return

        ref_speed = self.joystick_to_ref_speed(msg.long_disp, msg.lat_disp)
        self.get_logger().info(
            (
                'joy lat=%d long=%d -> left=%.1f right=%.1f'
                % (
                    msg.lat_disp,
                    msg.long_disp,
                    ref_speed.left_speed,
                    ref_speed.right_speed,
                )
            ),
            throttle_duration_sec=1.0,
        )
        self.publisher.publish(ref_speed)
        self.zero_published = (
            ref_speed.left_speed == 0.0 and ref_speed.right_speed == 0.0
        )

    def watchdog_callback(self):
        if not self.enabled:
            return

        if self.last_sensor_time is None:
            self.publish_zero()
            return

        sensor_age = time.monotonic() - self.last_sensor_time
        if sensor_age > self.sensor_timeout_sec:
            self.publish_zero()

    def joystick_to_ref_speed(self, long_disp, lat_disp):
        x = max(-1.0, min(1.0, float(lat_disp) / 100.0))
        y = max(-1.0, min(1.0, float(long_disp) / 100.0))

        left_speed, right_speed = self.mix_speeds(x, y)

        msg = RefSpeed()
        msg.left_speed = left_speed
        msg.right_speed = right_speed
        msg.long_disp = self.clamp_int8(long_disp)
        msg.lat_disp = self.clamp_int8(lat_disp)
        return msg

    def mix_speeds(self, x, y):
        if abs(x) < self.backward_x_threshold and y < 0.0:
            rev = self.clamp_speed(y * self.max_speed)
            return self.apply_speed_deadzone(rev, rev)

        mag = max(0.0, min(1.0, hypot(x, y)))

        if abs(x) > 0.0 and y <= 0.0:
            outer = 1.0
            inner = 0.0
        else:
            angle = atan2(abs(x), abs(y))
            turn_prop = angle / (pi / 2.0)
            outer = 1.0
            inner = 1.0 - turn_prop

        left_f = inner if x >= 0.0 else outer
        right_f = outer if x >= 0.0 else inner
        direction = 1.0 if abs(x) > 0.0 or y >= 0.0 else -1.0

        left_speed = self.clamp_speed(left_f * mag * direction * self.max_speed)
        right_speed = self.clamp_speed(right_f * mag * direction * self.max_speed)

        left_speed, right_speed = self.apply_speed_deadzone(
            left_speed, right_speed
        )
        return self.straighten_close_speeds(left_speed, right_speed)

    def apply_speed_deadzone(self, left_speed, right_speed):
        if (
            -self.deadzone < left_speed < self.deadzone
            and -self.deadzone < right_speed < self.deadzone
        ):
            return 0.0, 0.0

        return left_speed, right_speed

    def straighten_close_speeds(self, left_speed, right_speed):
        diff = abs(left_speed - right_speed)
        if diff >= self.diff_threshold:
            return left_speed, right_speed

        if left_speed > 0 and right_speed > 0:
            speed = max(left_speed, right_speed)
            return speed, speed

        if left_speed < 0 and right_speed < 0:
            speed = min(left_speed, right_speed)
            return speed, speed

        return left_speed, right_speed

    def clamp_speed(self, value):
        return max(-1.0, min(1.0, float(value)))

    def clamp_int8(self, value):
        return int(max(-128, min(127, round(value))))

    def publish_zero(self):
        if self.zero_published:
            return

        msg = RefSpeed()
        msg.left_speed = 0.0
        msg.right_speed = 0.0
        msg.lat_disp = 0
        msg.long_disp = 0
        self.publisher.publish(msg)
        self.zero_published = True


def main(args=None):
    rclpy.init(args=args)
    node = JoystickControl()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.publish_zero()
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
