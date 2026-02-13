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
    ])
