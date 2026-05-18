#ifndef SENSORV2_JOYSTICK_H
#define SENSORV2_JOYSTICK_H

#include <Adafruit_ADS1X15.h>
#include <Arduino.h>

#include "SensorStatus.h"

namespace sensorv2 {

/**
 * Normalized joystick output ready to be copied into
 * autogiro_interfaces/msg/Sensors. Values are clamped to -100..100 to fit the
 * Sensors int8 fields.
 */
struct JoystickSample {
  int8_t longDisp = 0;
  int8_t latDisp = 0;
  int8_t leftSpeed = 0;
  int8_t rightSpeed = 0;
};

/**
 * ADS1115-backed wheelchair joystick reader.
 *
 * Hardware mapping (matches sensor v1):
 *   ADS1115 default address 0x48
 *   AIN0: forward/backward axis
 *   AIN1: left/right axis
 */
class Joystick {
public:
  Joystick();

  /**
   * Attempts to bring the ADC online. Retries internally up to
   * kInitialBeginAttempts times. Safe to call from setup(); call
   * retryIfNeeded() from the main loop to re-attempt later if init fails.
   */
  bool begin(uint8_t i2cAddress = 0x48);

  /**
   * If the joystick is offline and the retry interval has elapsed,
   * attempts one more adc.begin(). Non-blocking when the joystick is online.
   */
  void retryIfNeeded(unsigned long now);

  bool online() const { return status_.online(); }
  const SensorStatus &status() const { return status_; }

  /**
   * Reads the joystick once. Returns a zeroed sample when offline.
   */
  JoystickSample read();

private:
  struct NormalizedAxes {
    float x = 0.0f;
    float y = 0.0f;
  };

  static constexpr uint8_t kForwardChannel = 0;
  static constexpr uint8_t kSidewaysChannel = 1;
  static constexpr uint8_t kInitialBeginAttempts = 3;
  static constexpr unsigned long kRetryIntervalMs = 5000;

  // Calibrated from sensor v1: the second term cancels the GAIN_ONE offset.
  static constexpr int16_t kForwardCenter = 8500 + 4400;
  static constexpr int16_t kSidewaysCenter = 8400 + 4400;
  static constexpr float kMaxInputCounts = 13000.0f;
  static constexpr int8_t kDeadzone = 30;
  static constexpr int8_t kStraightenDiff = 30;
  static constexpr float kBackwardXThreshold = 0.65f;

  bool tryBegin();
  NormalizedAxes readAxes();
  static JoystickSample axesToSample(NormalizedAxes axes);
  static void applyDeadzone(JoystickSample &sample);
  static void straightenNearEqualWheelSpeeds(JoystickSample &sample);

  Adafruit_ADS1115 adc_;
  SensorStatus status_;
  uint8_t i2cAddress_;
};

} // namespace sensorv2

#endif // SENSORV2_JOYSTICK_H
