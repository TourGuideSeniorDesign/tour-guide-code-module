#include <Arduino.h>

#include <cstring>

#include "MicroRos.h"
#include "sensors/Joystick.h"

namespace {

constexpr unsigned long kSerialWaitMs = 2000;
constexpr unsigned long kErrorPublishIntervalMs = 5000;
constexpr unsigned long kLoopDelayMs = 10;
constexpr unsigned long kTransportSettleMs = 2000;

sensorv2::Joystick joystick;
unsigned long lastErrorPublishMs = 0;

void waitForSerial(unsigned long timeoutMs) {
  const unsigned long startMs = millis();
  while (!Serial && (millis() - startMs) < timeoutMs) {
    delay(10);
  }
}

void writeJoystickFields(autogiro_interfaces__msg__Sensors &msg,
                         const sensorv2::JoystickSample &sample) {
  msg.long_disp = sample.longDisp;
  msg.lat_disp = sample.latDisp;
  msg.left_speed = sample.leftSpeed;
  msg.right_speed = sample.rightSpeed;
}

sensorv2::SensorErrors currentErrors() {
  sensorv2::SensorErrors errors;
  errors.joystickAdc = !joystick.online();
  // Sensors not yet implemented on sensorv2 — report as offline so the rest of
  // the system can tell they're missing instead of silently zero.
  errors.ultrasonicAdc = true;
  errors.fingerprint = true;
  errors.imu = true;
  return errors;
}

} // namespace

void setup() {
  Serial.begin(115200);
  waitForSerial(kSerialWaitMs);

  sensorv2::microros::begin();
  delay(kTransportSettleMs);

  // Best-effort initial ADC bring-up. If it fails the loop will keep retrying.
  joystick.begin(0x48);
}

void loop() {
  const unsigned long now = millis();

  sensorv2::microros::tick();
  joystick.retryIfNeeded(now);

  const sensorv2::JoystickSample sample = joystick.read();

  autogiro_interfaces__msg__Sensors &msg = sensorv2::microros::sensorMsg();
  std::memset(&msg, 0, sizeof(msg));
  writeJoystickFields(msg, sample);

  if (sensorv2::microros::connected() &&
      (now - lastErrorPublishMs) >= kErrorPublishIntervalMs) {
    if (sensorv2::microros::publishError(currentErrors())) {
      lastErrorPublishMs = now;
    }
  }

  delay(kLoopDelayMs);
}
