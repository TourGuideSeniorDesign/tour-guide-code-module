#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from nav_msgs.msg import Odometry
from geometry_msgs.msg import TransformStamped
from wheelchair_sensor_msgs.msg import Motors
import math
from tf2_ros import TransformBroadcaster



# Wheel diameter = 12.5 Inch
# wheel radius = 6.25 inch
# wheel radius meters = 0.15875 meters



class MotorOdometry(Node):
    def __init__(self):
        super().__init__('motor_odometry')
        self.declare_parameter('wheel_base', 0.55)   # meters
        self.declare_parameter('odom_frame', 'odom')
        self.declare_parameter('base_frame', 'base_link')

        self.wheel_base = float(self.get_parameter('wheel_base').value)
        self.odom_frame = self.get_parameter('odom_frame').value
        self.base_frame = self.get_parameter('base_frame').value

        # Remove motor_speed subscription for temporary static odom
        # self.sub = self.create_subscription(Motors, 'motor_speed', self.cb_motors, 10)
        self.pub = self.create_publisher(Odometry, 'odom', 10)
        self.tf_broadcaster = TransformBroadcaster(self)

        # Add timer to publish static odom at 10 Hz
        self.timer = self.create_timer(0.1, self.publish_static_odom)

        # Static pose (zero movement)
        self.x = 0.0
        self.y = 0.0
        self.yaw = 0.0

        self.publish_static_odom()

    def publish_static_odom(self):
        now = self.get_clock().now()

        # publish TF
        t = TransformStamped()
        t.header.stamp = now.to_msg()
        t.header.frame_id = self.odom_frame
        t.child_frame_id = self.base_frame
        t.transform.translation.x = self.x
        t.transform.translation.y = self.y
        t.transform.translation.z = 0.0
        qz = math.sin(self.yaw / 2.0)
        qw = math.cos(self.yaw / 2.0)
        t.transform.rotation.x = 0.0
        t.transform.rotation.y = 0.0
        t.transform.rotation.z = qz
        t.transform.rotation.w = qw
        self.tf_broadcaster.sendTransform(t)

        # publish Odometry
        odom = Odometry()
        odom.header.stamp = now.to_msg()
        odom.header.frame_id = self.odom_frame
        odom.child_frame_id = self.base_frame
        odom.pose.pose.position.x = self.x
        odom.pose.pose.position.y = self.y
        odom.pose.pose.position.z = 0.0
        odom.pose.pose.orientation = t.transform.rotation
        odom.twist.twist.linear.x = 0.0  # static, no movement
        odom.twist.twist.angular.z = 0.0  # static, no rotation
        self.pub.publish(odom)
    def cb_motors(self, msg: Motors):
        now = self.get_clock().now()
        if self.last_time is None:
            self.last_time = now
            return
        dt = (now - self.last_time).nanoseconds * 1e-9
        if dt <= 0.0:
            return
        self.last_time = now

        vl = float(msg.left_mph) * MPH_TO_MS
        vr = float(msg.right_mph) * MPH_TO_MS

        v = (vr + vl) / 2.0
        omega = (vr - vl) / self.wheel_base

        # integrate pose (simple Euler)
        self.x += v * math.cos(self.yaw) * dt
        self.y += v * math.sin(self.yaw) * dt
        self.yaw += omega * dt

        # publish TF
        t = TransformStamped()
        t.header.stamp = now.to_msg()
        t.header.frame_id = self.odom_frame
        t.child_frame_id = self.base_frame
        t.transform.translation.x = self.x
        t.transform.translation.y = self.y
        t.transform.translation.z = 0.0
        qz = math.sin(self.yaw / 2.0)
        qw = math.cos(self.yaw / 2.0)
        t.transform.rotation.x = 0.0
        t.transform.rotation.y = 0.0
        t.transform.rotation.z = qz
        t.transform.rotation.w = qw
        self.tf_broadcaster.sendTransform(t)

        # publish Odometry
        odom = Odometry()
        odom.header.stamp = now.to_msg()
        odom.header.frame_id = self.odom_frame
        odom.child_frame_id = self.base_frame
        odom.pose.pose.position.x = self.x
        odom.pose.pose.position.y = self.y
        odom.pose.pose.position.z = 0.0
        odom.pose.pose.orientation = t.transform.rotation
        odom.twist.twist.linear.x = v
        odom.twist.twist.angular.z = omega
        self.pub.publish(odom)

def main(args=None):
    rclpy.init(args=args)
    node = MotorOdometry()
    try:
        rclpy.spin(node)
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
