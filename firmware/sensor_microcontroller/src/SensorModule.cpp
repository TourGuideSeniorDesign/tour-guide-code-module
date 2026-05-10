#include "SensorModule.h"
#include "debug.h"

#if !defined(ROS) && !defined(ROS_DEBUG)
static const char *sensorStateName(SensorState state) {
  switch (state) {
  case SensorState::Uninitialized:
    return "uninitialized";
  case SensorState::Online:
    return "online";
  case SensorState::Offline:
    return "offline";
  default:
    return "unknown";
  }
}
#endif

void markSensorOnline(SensorModule &module) {
  module.state = SensorState::Online;
  module.lastAttemptMs = millis();
}

void markSensorOffline(SensorModule &module, unsigned long now) {
  module.state = SensorState::Offline;
  module.lastAttemptMs = now;
}

void logSensorStatus(const SensorModule &module) {
#if !defined(ROS) && !defined(ROS_DEBUG)
  DEBUG_PRINT(module.name);
  DEBUG_PRINT(" status: ");
  DEBUG_PRINTLN(sensorStateName(module.state));
#else
  (void)module;
#endif
}
