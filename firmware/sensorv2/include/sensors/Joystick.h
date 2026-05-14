#ifndef SENSORV2_JOYSTICK_H
#define SENSORV2_JOYSTICK_H

#include <Arduino.h>
#include <Adafruit_ADS1X15.h>

namespace sensorv2 {

/**
 * Normalized joystick output ready to be copied into autogiro_interfaces/msg/Sensors.
 * Values are intentionally constrained to -100..100 to fit the Sensors int8 fields.
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
 * Hardware mapping:
 *   ADS1115 address 0x48
 *   AIN0: forward/backward axis
 *   AIN1: left/right axis
 */
class Joystick {
public:
  bool begin(uint8_t i2cAddress = 0x48);
  bool available() const { return available_; }

  /**
   * Reads the joystick once and returns displacement + differential wheel speed commands.
   * Returns a zero sample if the ADC did not initialize successfully.
   */
  JoystickSample read();

private:
  struct NormalizedAxes {
    float x = 0.0f;
    float y = 0.0f;
  };

  static constexpr uint8_t kForwardChannel = 0;
  static constexpr uint8_t kSidewaysChannel = 1;

  // Calibrated from the original sensor firmware. The offset compensates for
  // the ADS1115 gain configuration used on the wheelchair sensor board.
  static constexpr int16_t kForwardCenter = 8500 + 4400;
  static constexpr int16_t kSidewaysCenter = 8400 + 4400;
  static constexpr float kMaxInputCounts = 13000.0f;
  static constexpr int8_t kDeadzone = 30;
  static constexpr int8_t kStraightenDiff = 30;
  static constexpr float kBackwardXThreshold = 0.65f;

  NormalizedAxes readAxes();
  static JoystickSample axesToSample(NormalizedAxes axes);
  static void applyDeadzone(JoystickSample &sample);
  static void straightenNearEqualWheelSpeeds(JoystickSample &sample);

  Adafruit_ADS1115 adc_;
  bool available_ = false;
};

} // namespace sensorv2

#endif // SENSORV2_JOYSTICK_H
