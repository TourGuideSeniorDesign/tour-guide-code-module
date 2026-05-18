# SensorV2 Firmware

Pico SensorV2 firmware that connects to the micro-ROS agent and publishes `autogiro_interfaces/msg/Sensors` on the `sensors` topic.

Currently integrated:

- Joystick via ADS1115 at I2C address `0x48`
  - `AIN0`: forward/backward
  - `AIN1`: left/right
  - Publishes `long_disp`, `lat_disp`, `left_speed`, and `right_speed`

Planned one-at-a-time sensor reintegration order:

1. Joystick
2. Ultrasonic ADCs
3. PIR sensors
4. Fan RPM
5. IMU
6. Fingerprint
7. Light / LiDAR command subscribers
8. Sensor error reporting, retry policy, and watchdog polish

Build:

```sh
pio run -e ROS
```
