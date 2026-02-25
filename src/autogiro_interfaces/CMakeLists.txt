cmake_minimum_required(VERSION 3.8)
project(autogiro_interfaces)

find_package(ament_cmake REQUIRED)
find_package(rosidl_default_generators REQUIRED)

rosidl_generate_interfaces(${PROJECT_NAME}
  "msg/Status.msg"
  "msg/FanSpeed.msg"
  "msg/Sensors.msg"
  "msg/RefSpeed.msg"
  "msg/Battery.msg"
  "msg/Brake.msg"
  "msg/DacValues.msg"
  "msg/Fingerprint.msg"
  "msg/Lidar.msg"
  "msg/Light.msg"
  "msg/Motors.msg"
  "msg/SensorError.msg"
)

ament_package()
