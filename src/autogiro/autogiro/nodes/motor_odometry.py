import math
from typing import Optional, Sequence

import rclpy
from autogiro.qos_profiles import MONITORING
from autogiro_interfaces.msg import Motors
from geometry_msgs.msg import TransformStamped
from nav_msgs.msg import Odometry
from rclpy.node import Node
from rclpy.time import Time
from tf2_ros import TransformBroadcaster


MPH_TO_MPS = 0.44704
DEFAULT_WHEEL_SEPARATION_M = 0.6858


def yaw_to_quaternion(yaw: float):
    half_yaw = yaw * 0.5
    return math.sin(half_yaw), math.cos(half_yaw)


def normalize_angle(angle: float) -> float:
    return math.atan2(math.sin(angle), math.cos(angle))


def diagonal_covariance(values: Sequence[float]) -> list[float]:
    if len(values) != 6:
        raise ValueError('Covariance diagonal parameters must contain 6 values')

    covariance = [0.0] * 36
    for index, value in enumerate(values):
        covariance[index * 6 + index] = float(value)
    return covariance


class MotorOdometry(Node):
    def __init__(self):
        super().__init__('motor_odometry')

        self.declare_parameter('motor_topic', '/motor_speed')
        self.declare_parameter('odom_topic', '/odom')
        self.declare_parameter('odom_frame_id', 'odom')
        self.declare_parameter('base_frame_id', 'base_link')
        self.declare_parameter('wheel_separation_m', DEFAULT_WHEEL_SEPARATION_M)
        self.declare_parameter('publish_rate_hz', 20.0)
        self.declare_parameter('stale_timeout_s', 1.5)
        self.declare_parameter('publish_tf', True)
        self.declare_parameter('left_mph_to_mps', MPH_TO_MPS)
        self.declare_parameter('right_mph_to_mps', MPH_TO_MPS)
        self.declare_parameter('pose_covariance_diagonal', [0.05, 0.05, 1e6, 1e6, 1e6, 0.2])
        self.declare_parameter('twist_covariance_diagonal', [0.05, 0.05, 1e6, 1e6, 1e6, 0.2])

        self.motor_topic = self.get_parameter('motor_topic').value
        self.odom_frame_id = self.get_parameter('odom_frame_id').value
        self.base_frame_id = self.get_parameter('base_frame_id').value
        self.wheel_separation_m = float(self.get_parameter('wheel_separation_m').value)
        self.publish_rate_hz = float(self.get_parameter('publish_rate_hz').value)
        self.stale_timeout_s = float(self.get_parameter('stale_timeout_s').value)
        self.publish_tf = bool(self.get_parameter('publish_tf').value)
        self.left_mph_to_mps = float(self.get_parameter('left_mph_to_mps').value)
        self.right_mph_to_mps = float(self.get_parameter('right_mph_to_mps').value)
        self.pose_covariance = diagonal_covariance(
            self.get_parameter('pose_covariance_diagonal').value
        )
        self.twist_covariance = diagonal_covariance(
            self.get_parameter('twist_covariance_diagonal').value
        )

        if self.wheel_separation_m <= 0.0:
            raise ValueError('wheel_separation_m must be greater than 0')
        if self.publish_rate_hz <= 0.0:
            raise ValueError('publish_rate_hz must be greater than 0')
        if self.stale_timeout_s <= 0.0:
            raise ValueError('stale_timeout_s must be greater than 0')

        odom_topic = self.get_parameter('odom_topic').value
        self.odom_publisher = self.create_publisher(Odometry, odom_topic, 10)
        self.tf_broadcaster = TransformBroadcaster(self) if self.publish_tf else None
        self.subscription = self.create_subscription(
            Motors,
            self.motor_topic,
            self.motor_callback,
            MONITORING,
        )

        self.x = 0.0
        self.y = 0.0
        self.yaw = 0.0
        self.left_mps = 0.0
        self.right_mps = 0.0
        self.last_motor_time: Optional[Time] = None
        self.last_publish_time = self.get_clock().now()
        self.speeds_stale = False
        self.received_motor_message = False

        self.timer = self.create_timer(1.0 / self.publish_rate_hz, self.timer_callback)

        self.get_logger().info(
            f'Motor odometry publishing {odom_topic} from {self.motor_topic} '
            f'with wheel_separation_m={self.wheel_separation_m:.3f}'
        )

    def motor_callback(self, msg: Motors):
        self.left_mps = float(msg.left_mph) * self.left_mph_to_mps
        self.right_mps = float(msg.right_mph) * self.right_mph_to_mps
        self.last_motor_time = self.get_clock().now()

        if not self.received_motor_message:
            self.get_logger().info('Received first motor speed message')
            self.received_motor_message = True

        if self.speeds_stale:
            self.get_logger().info('Motor speed messages resumed')
            self.speeds_stale = False

    def timer_callback(self):
        now = self.get_clock().now()
        dt = (now - self.last_publish_time).nanoseconds * 1e-9
        self.last_publish_time = now

        if dt < 0.0:
            self.get_logger().warn('Clock moved backwards; skipping odometry integration')
            self.publish_odometry(now, 0.0, 0.0)
            return

        left_mps, right_mps = self.current_wheel_speeds(now)
        linear_mps, angular_rad_s = self.integrate(left_mps, right_mps, dt)
        self.publish_odometry(now, linear_mps, angular_rad_s)

    def current_wheel_speeds(self, now: Time) -> tuple[float, float]:
        if self.last_motor_time is None:
            return 0.0, 0.0

        age_s = (now - self.last_motor_time).nanoseconds * 1e-9
        if age_s > self.stale_timeout_s:
            if not self.speeds_stale:
                self.get_logger().warn(
                    f'Motor speed messages stale for {age_s:.2f}s; holding odometry velocity at zero'
                )
                self.speeds_stale = True
            return 0.0, 0.0

        return self.left_mps, self.right_mps

    def integrate(self, left_mps: float, right_mps: float, dt: float) -> tuple[float, float]:
        linear_mps = (right_mps + left_mps) * 0.5
        angular_rad_s = (right_mps - left_mps) / self.wheel_separation_m

        delta_yaw = angular_rad_s * dt
        distance = linear_mps * dt
        mid_yaw = self.yaw + delta_yaw * 0.5

        self.x += distance * math.cos(mid_yaw)
        self.y += distance * math.sin(mid_yaw)
        self.yaw = normalize_angle(self.yaw + delta_yaw)

        return linear_mps, angular_rad_s

    def publish_odometry(self, stamp: Time, linear_mps: float, angular_rad_s: float):
        qz, qw = yaw_to_quaternion(self.yaw)

        odom_msg = Odometry()
        odom_msg.header.stamp = stamp.to_msg()
        odom_msg.header.frame_id = self.odom_frame_id
        odom_msg.child_frame_id = self.base_frame_id
        odom_msg.pose.pose.position.x = self.x
        odom_msg.pose.pose.position.y = self.y
        odom_msg.pose.pose.position.z = 0.0
        odom_msg.pose.pose.orientation.x = 0.0
        odom_msg.pose.pose.orientation.y = 0.0
        odom_msg.pose.pose.orientation.z = qz
        odom_msg.pose.pose.orientation.w = qw
        odom_msg.pose.covariance = self.pose_covariance
        odom_msg.twist.twist.linear.x = linear_mps
        odom_msg.twist.twist.linear.y = 0.0
        odom_msg.twist.twist.angular.z = angular_rad_s
        odom_msg.twist.covariance = self.twist_covariance
        self.odom_publisher.publish(odom_msg)

        if self.tf_broadcaster is None:
            return

        transform = TransformStamped()
        transform.header.stamp = odom_msg.header.stamp
        transform.header.frame_id = self.odom_frame_id
        transform.child_frame_id = self.base_frame_id
        transform.transform.translation.x = self.x
        transform.transform.translation.y = self.y
        transform.transform.translation.z = 0.0
        transform.transform.rotation.x = 0.0
        transform.transform.rotation.y = 0.0
        transform.transform.rotation.z = qz
        transform.transform.rotation.w = qw
        self.tf_broadcaster.sendTransform(transform)


def main(args=None):
    rclpy.init(args=args)
    node = MotorOdometry()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
