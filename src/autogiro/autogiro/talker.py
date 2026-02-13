import rclpy
from rclpy.node import Node
from autogiro_interfaces.msg import Status
from autogiro_utils import remote_logger


class Talker(Node):
    def __init__(self):
        super().__init__('talker')
        self.publisher_ = self.create_publisher(Status, '/status', 10)
        self.timer = self.create_timer(1.0, self.timer_callback)
        self.count = 0

    def timer_callback(self):
        msg = Status()
        msg.name = 'talker'
        msg.message = f'Hello from talker (count={self.count})'
        msg.count = self.count
        self.publisher_.publish(msg)
        self.get_logger().info(f'Publishing: name="{msg.name}" message="{msg.message}" count={msg.count}')
        remote_logger.log("talker", "info", f'Publishing: name="{msg.name}" message="{msg.message}" count={msg.count}')
        self.count += 1


def main(args=None):
    rclpy.init(args=args)
    node = Talker()
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
