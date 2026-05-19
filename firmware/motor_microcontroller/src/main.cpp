/* Eren Tekbas — ECE Senior Design 2025
 *
 * Motor microcontroller:
 *   - subscribes to /ref_speed (commanded wheel speeds as signed fraction of
 *     max, in [-1.0, +1.0]; magnitude scales the DAC up to kMotorMaxDacCounts)
 *   - subscribes to /ebrake (forces brake on)
 *   - drives left/right ElectroCraft EZ Drive controllers via I2C DAC
 *     (speed command) and direction/enable/brake GPIOs
 *   - publishes /motor_speed (measured mph from wheel encoders)
 *   - publishes /dac_value (telemetry of the commanded DAC counts)
 */

#include "RefSpeed.h"
#include "debug.h"
#include "globals.h"
#include <Adafruit_MCP4725.h>
#include <Arduino.h>

#if defined(ROS) || defined(ROS_DEBUG)
#include "microRosFunctions.h"
#include <micro_ros_platformio.h>
#endif

// ---- Pin assignments (RP2040 GPxx) ----
constexpr uint8_t kBrakePin = 10;
constexpr uint8_t kEnablePin = 11;
constexpr uint8_t kDirectionLPin = 12;
constexpr uint8_t kDirectionRPin = 13;
constexpr uint8_t kSpeedFreqLPin = 14;
constexpr uint8_t kSpeedFreqRPin = 15;

// ---- MCP4725 DACs (12-bit, 0..4095) ----
constexpr uint8_t kDacAAddress = 0x62; // left  motor speed command
constexpr uint8_t kDacBAddress = 0x63; // right motor speed command
constexpr int16_t kMotorMaxDacCounts =
    666; // safety cap; raise toward 4095 for higher top speed

// ---- Encoder-pulse → mph scale ----
constexpr unsigned long kFreqSampleMs = 50;
constexpr float kFreqToMph =
    (10.0f / 21.33f) * 3.14f * 12.5f * 60.0f / 63360.0f;

Adafruit_MCP4725 dacA;
Adafruit_MCP4725 dacB;

// Measured wheel speed in mph. Read by the /motor_speed publisher in
// microRosFunctions.
float speedR = 0.0f;
float speedL = 0.0f;

// Encoder ISRs
volatile uint32_t pulseCountR = 0;
volatile uint32_t pulseCountL = 0;
void onPulseR() { pulseCountR++; }
void onPulseL() { pulseCountL++; }

unsigned long freqSampleStart = 0;
bool measuringFreq = false;
refSpeed refSpeedSensors;

void setup() {
  Serial.begin(115200);
  while (!Serial)
    delay(10);
  delay(2000);

#if defined(ROS) || defined(ROS_DEBUG)
  set_microros_serial_transports(Serial);
  delay(2000);
#endif

  while (!dacA.begin(kDacAAddress)) {
    DEBUG_PRINTLN("DAC A not found");
    delay(500);
  }
  while (!dacB.begin(kDacBAddress)) {
    DEBUG_PRINTLN("DAC B not found");
    delay(500);
  }

  pinMode(kDirectionLPin, OUTPUT);
  pinMode(kDirectionRPin, OUTPUT);
  pinMode(kEnablePin, OUTPUT);
  pinMode(kBrakePin, OUTPUT);

  pinMode(kSpeedFreqRPin, INPUT_PULLDOWN);
  pinMode(kSpeedFreqLPin, INPUT_PULLDOWN);
  attachInterrupt(digitalPinToInterrupt(kSpeedFreqRPin), onPulseR, RISING);
  attachInterrupt(digitalPinToInterrupt(kSpeedFreqLPin), onPulseL, RISING);
}

// Map a signed ref-speed fraction in [-1.0, +1.0] to the EZ Drive's per-motor
// signals. The EZ Drive direction pin is active-low; on this chassis a
// positive ref-speed wants the LOW value to drive the wheel forward.
struct MotorCommand {
  uint8_t directionPinValue; // HIGH or LOW
  int16_t dacCounts;         // 0..kMotorMaxDacCounts
};

MotorCommand commandFromRef(float refSpeed) {
  const float magnitude = fminf(fabsf(refSpeed), 1.0f);
  return {
      (refSpeed > 0.0f) ? LOW : HIGH,
      static_cast<int16_t>(magnitude * kMotorMaxDacCounts),
  };
}

// Non-blocking encoder sampling. Once per kFreqSampleMs, refresh speedL/speedR.
void updateMeasuredSpeed() {
  if (!measuringFreq) {
    pulseCountR = 0;
    pulseCountL = 0;
    freqSampleStart = millis();
    measuringFreq = true;
    return;
  }
  if (millis() - freqSampleStart < kFreqSampleMs)
    return;

  speedR = (pulseCountR * 1000.0f / kFreqSampleMs) * kFreqToMph;
  speedL = (pulseCountL * 1000.0f / kFreqSampleMs) * kFreqToMph;
  measuringFreq = false;
}

void loop() {
#if defined(ROS) || defined(ROS_DEBUG)
  microRosTick();
  refSpeedSensors = getRefSpeed();
#endif

  const bool bothZero =
      refSpeedSensors.leftSpeed == 0.0f && refSpeedSensors.rightSpeed == 0.0f;

  // Enable is active-low: LOW enables the drive, HIGH disables (coast).
  const uint8_t enableValue = bothZero ? HIGH : LOW;

  // Brake is active-low: LOW engages the brake. Latch the brake open while
  // commanded to move; on a zero command leave its previous state alone so
  // the chassis holds position after stopping. /ebrake forces it closed.
  static bool brakeReleased = false;
  if (!bothZero)
    brakeReleased = true;
#if defined(ROS) || defined(ROS_DEBUG)
  if (eBrake)
    brakeReleased = false;
#endif

  const MotorCommand left = commandFromRef(refSpeedSensors.leftSpeed);
  const MotorCommand right = commandFromRef(refSpeedSensors.rightSpeed);

  digitalWrite(kDirectionLPin, left.directionPinValue);
  digitalWrite(kDirectionRPin, right.directionPinValue);
  digitalWrite(kEnablePin, enableValue);
  digitalWrite(kBrakePin, brakeReleased ? HIGH : LOW);
  dacA.setVoltage(left.dacCounts, false);
  dacB.setVoltage(right.dacCounts, false);

#if defined(ROS) || defined(ROS_DEBUG)
  transmitDac(left.dacCounts, right.dacCounts);
#endif

  updateMeasuredSpeed();
}
