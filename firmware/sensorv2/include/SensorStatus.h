#ifndef SENSORV2_SENSOR_STATUS_H
#define SENSORV2_SENSOR_STATUS_H

#include <Arduino.h>

namespace sensorv2 {

enum class SensorState : uint8_t {
  Uninitialized,
  Online,
  Offline,
};

class SensorStatus {
public:
  SensorStatus(const char *name, unsigned long retryIntervalMs);

  bool online() const { return state_ == SensorState::Online; }
  bool shouldRetry(unsigned long now) const;

  void markOnline(unsigned long now);
  void markOffline(unsigned long now);

  const char *name() const { return name_; }
  SensorState state() const { return state_; }

private:
  const char *name_;
  SensorState state_;
  unsigned long lastAttemptMs_;
  unsigned long retryIntervalMs_;
};

} // namespace sensorv2

#endif // SENSORV2_SENSOR_STATUS_H
