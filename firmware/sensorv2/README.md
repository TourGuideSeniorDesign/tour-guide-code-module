# SensorV2 Firmware

Minimal Pico SensorV2 firmware that connects to the micro-ROS agent and publishes an all-zero `autogiro_interfaces/msg/Sensors` message on the `sensors` topic.

Build:

```sh
pio run -e ROS
```
