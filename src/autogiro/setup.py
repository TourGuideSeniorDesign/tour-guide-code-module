import os
from glob import glob
from setuptools import setup

package_name = 'autogiro'

setup(
    name=package_name,
    version='0.0.1',
    packages=[package_name, package_name + '.nodes'],
    data_files=[
        ('share/ament_index/resource_index/packages', ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        (os.path.join('share', package_name, 'launch'), glob('launch/*.launch.py')),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='user',
    maintainer_email='user@example.com',
    description='Autogiro publisher and subscriber nodes',
    license='MIT',
    entry_points={
        'console_scripts': [
            'talker = autogiro.nodes.talker:main',
            'listener = autogiro.nodes.listener:main',
            'temp_monitor = autogiro.nodes.temp_monitor:main',
        ],
    },
)
