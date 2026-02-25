from launch import LaunchDescription
from launch_ros.actions import Node


def generate_launch_description():
    return LaunchDescription([
        Node(
            package='autogiro',
            executable='talker',
            output='screen',
        ),
        Node(
            package='autogiro',
            executable='listener',
            output='screen',
        ),
        Node(
            package='autogiro',
            executable='temp_monitor',
            output='screen',
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
