from launch import LaunchDescription
from launch_ros.actions import Node


def generate_launch_description():
    return LaunchDescription([
        # Node(
        #     package='autogiro',
        #     executable='talker',
        #     output='screen',
        # ),
        # Node(
        #     package='autogiro',
        #     executable='listener',
        #     output='screen',
        # ),
        Node(
            package='autogiro',
            executable='temp_monitor',
            output='screen',
        ),
        Node(
            package='autogiro',
            executable='joystick_control',
            output='screen',
            parameters=[
                {'enabled': False},
            ],
        ),
        Node(
            package='autogiro',
            executable='motor_odometry',
            output='screen',
            parameters=[{
                'motor_topic': '/motor_speed',
                'odom_topic': '/odom',
                'odom_frame_id': 'odom',
                'base_frame_id': 'base_link',
                'wheel_separation_m': 0.6858, # 27 inches to meters
                'publish_rate_hz': 20.0,
                'stale_timeout_s': 1.5,
            }],
        ),
        Node(
            package='rosbridge_server',
            executable='rosbridge_websocket',
            output='screen',
            parameters=[
                {'port': 9090},
                {'call_services_in_new_thread': True},
                {'send_action_goals_in_new_thread': True},
                {'default_call_service_timeout': 5.0}
            ],
        ),
    ])
