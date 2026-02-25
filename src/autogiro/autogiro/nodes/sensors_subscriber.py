import rclpy
from rclpy.node import Node
from autogiro_interfaces.msg import Sensors
from autogiro.qos_profiles import SENSOR

class SensorsSubscriber(Node):
    def __init__(self):
        super().__init__('sensors_subscriber')
        self.latest_sensor_data = None
        self.subscription = self.create_subscription(
            Sensors,
            'sensors',
            self.topic_callback,
            SENSOR
        )

    def topic_callback(self, msg):
        self.latest_sensor_data = msg

    def get_latest_sensor_data(self):
        return self.latest_sensor_data


def main(args=None):
    rclpy.init(args=args)
    node = SensorsSubscriber()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
