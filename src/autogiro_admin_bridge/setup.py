from setuptools import setup

package_name = 'autogiro_admin_bridge'

setup(
    name=package_name,
    version='0.0.1',
    packages=[package_name],
    data_files=[
        ('share/ament_index/resource_index/packages', ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='user',
    maintainer_email='user@example.com',
    description='Read-only HTTP bridge exposing selected ROS 2 topics for the remote-management dashboard.',
    license='MIT',
    entry_points={
        'console_scripts': [
            'bridge = autogiro_admin_bridge.bridge_node:main',
        ],
    },
)
