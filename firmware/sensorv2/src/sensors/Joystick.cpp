#include "sensors/Joystick.h"

#include <cmath>

namespace sensorv2 {
namespace {
constexpr float kHalfPi = 1.57079632679f;

float clampUnit(float value) { return constrain(value, -1.0f, 1.0f); }

int8_t scaleToPercent(float value) {
  return static_cast<int8_t>(roundf(constrain(value, -1.0f, 1.0f) * 100.0f));
}
} // namespace

Joystick::Joystick()
    : status_("joystick_adc", kRetryIntervalMs), i2cAddress_(0x48) {}

bool Joystick::tryBegin() {
  if (!adc_.begin(i2cAddress_)) {
    return false;
  }
  // +/- 4.096V; matches the sensor v1 calibration.
  adc_.setGain(GAIN_ONE);
  return true;
}

bool Joystick::begin(uint8_t i2cAddress) {
  i2cAddress_ = i2cAddress;
  const unsigned long now = millis();

  for (uint8_t attempt = 0; attempt < kInitialBeginAttempts; ++attempt) {
    if (tryBegin()) {
      status_.markOnline(now);
      return true;
    }
  }
  status_.markOffline(now);
  return false;
}

void Joystick::retryIfNeeded(unsigned long now) {
  if (!status_.shouldRetry(now)) {
    return;
  }
  if (tryBegin()) {
    status_.markOnline(now);
  } else {
    status_.markOffline(now);
  }
}

Joystick::NormalizedAxes Joystick::readAxes() {
  const int16_t rawForward = adc_.readADC_SingleEnded(kForwardChannel);
  const int16_t rawSideways = adc_.readADC_SingleEnded(kSidewaysChannel);

  const int32_t centeredForward =
      static_cast<int32_t>(rawForward) - kForwardCenter;
  const int32_t centeredSideways =
      static_cast<int32_t>(rawSideways) - kSidewaysCenter;

  return {
      clampUnit(static_cast<float>(centeredSideways) / kMaxInputCounts),
      clampUnit(static_cast<float>(centeredForward) / kMaxInputCounts),
  };
}

JoystickSample Joystick::read() {
  if (!status_.online()) {
    return {};
  }
  return axesToSample(readAxes());
}

JoystickSample Joystick::axesToSample(NormalizedAxes axes) {
  JoystickSample sample{};

  sample.longDisp = scaleToPercent(axes.y);
  sample.latDisp = scaleToPercent(axes.x);

  // Preserves the v1 wheelchair behavior:
  // - straight backward drives both wheels backward
  // - backward + sideways pivots forward around the inner wheel
  // - forward mixes inner/outer wheel speeds smoothly
  if (fabsf(axes.x) < kBackwardXThreshold && axes.y < 0.0f) {
    const int8_t reverse = scaleToPercent(axes.y);
    sample.leftSpeed = reverse;
    sample.rightSpeed = reverse;
    applyDeadzone(sample);
    return sample;
  }

  float magnitude = hypotf(axes.x, axes.y);
  magnitude = constrain(magnitude, 0.0f, 1.0f);

  float outer = 1.0f;
  float inner = 1.0f;
  if (fabsf(axes.x) > 0.0f && axes.y <= 0.0f) {
    inner = 0.0f;
  } else {
    const float angle = atan2f(fabsf(axes.x), fabsf(axes.y));
    const float turnProportion = angle / kHalfPi;
    inner = 1.0f - turnProportion;
  }

  float left = (axes.x >= 0.0f) ? inner : outer;
  float right = (axes.x >= 0.0f) ? outer : inner;

  const int direction =
      (fabsf(axes.x) > 0.0f) ? 1 : (axes.y >= 0.0f ? 1 : -1);
  left *= magnitude * direction;
  right *= magnitude * direction;

  sample.leftSpeed = scaleToPercent(left);
  sample.rightSpeed = scaleToPercent(right);

  applyDeadzone(sample);
  straightenNearEqualWheelSpeeds(sample);
  return sample;
}

void Joystick::applyDeadzone(JoystickSample &sample) {
  if (abs(sample.leftSpeed) < kDeadzone && abs(sample.rightSpeed) < kDeadzone) {
    sample.leftSpeed = 0;
    sample.rightSpeed = 0;
  }
}

void Joystick::straightenNearEqualWheelSpeeds(JoystickSample &sample) {
  const int diff = abs(sample.leftSpeed - sample.rightSpeed);
  if (diff >= kStraightenDiff) {
    return;
  }

  if (sample.leftSpeed > 0 && sample.rightSpeed > 0) {
    const int8_t speed = sample.leftSpeed > sample.rightSpeed
                             ? sample.leftSpeed
                             : sample.rightSpeed;
    sample.leftSpeed = speed;
    sample.rightSpeed = speed;
  } else if (sample.leftSpeed < 0 && sample.rightSpeed < 0) {
    const int8_t speed = sample.leftSpeed < sample.rightSpeed
                             ? sample.leftSpeed
                             : sample.rightSpeed;
    sample.leftSpeed = speed;
    sample.rightSpeed = speed;
  }
}

} // namespace sensorv2
