#ifndef SENSORV2_MICROROS_H
#define SENSORV2_MICROROS_H

#include <Arduino.h>

#include <autogiro_interfaces/msg/sensors.h>

namespace sensorv2 {

/**
 * Sensor health snapshot used for /sensor_error publishes.
 * `true` means the corresponding sensor is currently unavailable.
 */
struct SensorErrors {
  bool joystickAdc = false;
  bool ultrasonicAdc = false;
  bool fingerprint = false;
  bool imu = false;
};

namespace microros {

/**
 * Installs the micro-ROS serial transport. Call once from setup() after
 * Serial.begin().
 */
void begin();

/**
 * Drives the agent state machine. Call every loop iteration. Handles
 * publishing /sensors at PUBLISH_PERIOD_MS via an internal timer.
 */
void tick();

bool connected();

/**
 * The sensor message that will be published by the next timer fire.
 * Main loop should zero this each tick and fill in the fields it owns.
 */
autogiro_interfaces__msg__Sensors &sensorMsg();

/**
 * Publishes a /sensor_error message (best-effort). Returns false if the
 * agent is not connected.
 */
bool publishError(const SensorErrors &errors);

} // namespace microros
} // namespace sensorv2

#endif // SENSORV2_MICROROS_H
