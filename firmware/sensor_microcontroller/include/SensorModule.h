#ifndef SENSOR_MICROCONTROLLER_SENSORMODULE_H
#define SENSOR_MICROCONTROLLER_SENSORMODULE_H

#include <Arduino.h>

/**
 * Standard health state used by all optional sensor modules.
 * A module can fail initialization without stopping the rest of the firmware.
 */
enum class SensorState : uint8_t {
  Uninitialized,
  Online,
  Offline,
};

struct SensorModule {
  const char *name;
  SensorState state;
  unsigned long lastAttemptMs;
  unsigned long retryIntervalMs;

  bool available() const { return state == SensorState::Online; }
  bool shouldRetry(unsigned long now) const {
    return state != SensorState::Online && (now - lastAttemptMs) >= retryIntervalMs;
  }
};

void markSensorOnline(SensorModule &module);
void markSensorOffline(SensorModule &module, unsigned long now);
void logSensorStatus(const SensorModule &module);

#endif // SENSOR_MICROCONTROLLER_SENSORMODULE_H
