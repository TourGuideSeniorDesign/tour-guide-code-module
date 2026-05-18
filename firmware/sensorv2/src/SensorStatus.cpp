#include "SensorStatus.h"

namespace sensorv2 {

SensorStatus::SensorStatus(const char *name, unsigned long retryIntervalMs)
    : name_(name), state_(SensorState::Uninitialized), lastAttemptMs_(0),
      retryIntervalMs_(retryIntervalMs) {}

bool SensorStatus::shouldRetry(unsigned long now) const {
  if (state_ == SensorState::Online) {
    return false;
  }
  return (now - lastAttemptMs_) >= retryIntervalMs_;
}

void SensorStatus::markOnline(unsigned long now) {
  state_ = SensorState::Online;
  lastAttemptMs_ = now;
}

void SensorStatus::markOffline(unsigned long now) {
  state_ = SensorState::Offline;
  lastAttemptMs_ = now;
}

} // namespace sensorv2
