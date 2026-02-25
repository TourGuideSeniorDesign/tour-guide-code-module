import rclpy
from rclpy.node import Node
from autogiro_interfaces.msg import Status
from autogiro_utils import remote_logger
from autogiro.qos_profiles import MONITORING


class Listener(Node):
    def __init__(self):
        super().__init__('listener')
        self.subscription = self.create_subscription(
            Status, '/status', self.listener_callback, MONITORING)

    def listener_callback(self, msg):
        self.get_logger().info(f'Received: name="{msg.name}" message="{msg.message}" count={msg.count}')
        remote_logger.log("listener", "info", f'Received: name="{msg.name}" message="{msg.message}" count={msg.count}')


def main(args=None):
    rclpy.init(args=args)
    node = Listener()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        remote_logger.shutdown()
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
