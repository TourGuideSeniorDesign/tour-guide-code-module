/* Noah Ross, Eren Tekbas
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
// Sample internally faster than the ROS publish rate so mode changes are caught
// quickly. Output smoothing below removes most of the pulse-count jitter.
constexpr unsigned long kFreqSampleMs = 100;
constexpr float kFreqToMph =
    (10.0f / 21.33f) * 3.14f * 12.5f * 60.0f / 63360.0f;

// Per-side tach calibration/doubling filter.
// The left tach sometimes reports normally, then sometimes reports an extra
// pulse train that is roughly 2x the true wheel speed.  Detection combines:
//   1) measured left/right ratio vs commanded left/right ratio,
//   2) which candidate, raw-left or half-left, better matches the right tach,
//   3) stable, non-pivot commands so real turns do not teach the filter.
constexpr float kLeftEncoderCalibration = 1.0f;
constexpr float kRightEncoderCalibration = 1.0f;
constexpr float kMinCompareMph = 0.35f;
constexpr float kMinCommandForRatio = 0.15f;
constexpr float kMinExpectedRatioForLearning = 0.65f;
constexpr float kMaxExpectedRatioForLearning = 1.55f;
constexpr float kCommandStableTolerance = 0.05f;
constexpr uint8_t kCommandStableHitsRequired = 2;
constexpr float kEqualRatioMin = 0.75f;
constexpr float kEqualRatioMax = 1.35f;
constexpr float kDoubleRatioMin = 1.45f;
constexpr float kDoubleRatioMax = 2.35f;
constexpr float kCandidateErrorMax = 0.35f;
constexpr float kScoreSwitchMargin = 0.12f;
constexpr float kModeHysteresisPenalty = 0.08f;
constexpr float kTemporalErrorWeight = 0.60f;
constexpr uint8_t kDetectionHitsRequired = 2;
constexpr float kOutputSmoothingAlpha = 0.25f;
constexpr float kStoppedCommandThreshold = 0.01f;

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

  noInterrupts();
  const uint32_t rightPulses = pulseCountR;
  const uint32_t leftPulses = pulseCountL;
  pulseCountR = 0;
  pulseCountL = 0;
  interrupts();

  const float rawRightMph = (rightPulses * 1000.0f / kFreqSampleMs) *
                            kFreqToMph * kRightEncoderCalibration;
  const float rawLeftMph = (leftPulses * 1000.0f / kFreqSampleMs) * kFreqToMph *
                           kLeftEncoderCalibration;

  static bool leftTachIsDoubled = false;
  static uint8_t equalHits = 0;
  static uint8_t doubleHits = 0;
  static float previousLeftCommand = 0.0f;
  static float previousRightCommand = 0.0f;
  static uint8_t stableCommandHits = 0;
  static bool hasPreviousCorrectedLeftMph = false;
  static float previousCorrectedLeftMph = 0.0f;
  static bool smoothingInitialized = false;
  static bool previousSampleWasCorrectedAsDoubled = false;

  const float leftCommandMagnitude = fabsf(refSpeedSensors.leftSpeed);
  const float rightCommandMagnitude = fabsf(refSpeedSensors.rightSpeed);
  const bool sameDirectionCommand =
      (refSpeedSensors.leftSpeed > 0.0f) == (refSpeedSensors.rightSpeed > 0.0f);
  const bool commandStable =
      fabsf(refSpeedSensors.leftSpeed - previousLeftCommand) <=
          kCommandStableTolerance &&
      fabsf(refSpeedSensors.rightSpeed - previousRightCommand) <=
          kCommandStableTolerance;
  previousLeftCommand = refSpeedSensors.leftSpeed;
  previousRightCommand = refSpeedSensors.rightSpeed;
  if (commandStable) {
    if (stableCommandHits < kCommandStableHitsRequired)
      stableCommandHits++;
  } else {
    stableCommandHits = 0;
  }

  const float expectedRatio = rightCommandMagnitude > 0.0f
                                  ? leftCommandMagnitude / rightCommandMagnitude
                                  : 0.0f;
  const bool commandsUsable = leftCommandMagnitude >= kMinCommandForRatio &&
                              rightCommandMagnitude >= kMinCommandForRatio &&
                              sameDirectionCommand &&
                              stableCommandHits >= kCommandStableHitsRequired &&
                              expectedRatio >= kMinExpectedRatioForLearning &&
                              expectedRatio <= kMaxExpectedRatioForLearning;
  const bool speedsComparable =
      rawRightMph >= kMinCompareMph && rawLeftMph >= kMinCompareMph;

  bool correctThisSampleAsDoubled = leftTachIsDoubled;

  if (commandsUsable && speedsComparable) {
    const float measuredRatio = rawLeftMph / rawRightMph;
    const float normalizedRatio = measuredRatio / expectedRatio;
    const float expectedLeftMph = rawRightMph * expectedRatio;
    const float halfLeftMph = rawLeftMph * 0.5f;
    const float errorScale = fmaxf(expectedLeftMph, 0.1f);
    const float normalCommandError =
        fabsf(rawLeftMph - expectedLeftMph) / errorScale;
    const float halfCommandError =
        fabsf(halfLeftMph - expectedLeftMph) / errorScale;
    const float temporalScale = fmaxf(previousCorrectedLeftMph, 0.2f);
    const float normalTemporalError =
        hasPreviousCorrectedLeftMph
            ? fabsf(rawLeftMph - previousCorrectedLeftMph) / temporalScale
            : 0.0f;
    const float halfTemporalError =
        hasPreviousCorrectedLeftMph
            ? fabsf(halfLeftMph - previousCorrectedLeftMph) / temporalScale
            : 0.0f;

    // Two-hypothesis scoring:
    //   H0: left tach is normal       -> true left = rawLeftMph
    //   H1: left tach is double-count -> true left = rawLeftMph / 2
    // Command error catches the 2x fault during steady straight/gentle motion;
    // temporal error catches abrupt raw-left jumps without trusting a single
    // noisy right sample. A small hysteresis penalty prevents chatter.
    const float normalScore =
        normalCommandError + kTemporalErrorWeight * normalTemporalError +
        (leftTachIsDoubled ? kModeHysteresisPenalty : 0.0f);
    const float halfScore = halfCommandError +
                            kTemporalErrorWeight * halfTemporalError +
                            (leftTachIsDoubled ? 0.0f : kModeHysteresisPenalty);

    const bool doubleRatioPlausible = normalizedRatio >= kDoubleRatioMin &&
                                      normalizedRatio <= kDoubleRatioMax;
    const bool equalRatioPlausible =
        normalizedRatio >= kEqualRatioMin && normalizedRatio <= kEqualRatioMax;
    const bool halfCandidatePlausible =
        halfCommandError <= kCandidateErrorMax &&
        halfScore + kScoreSwitchMargin < normalScore;
    const bool rawCandidatePlausible =
        normalCommandError <= kCandidateErrorMax &&
        normalScore + kScoreSwitchMargin < halfScore;

    if (doubleRatioPlausible && halfCandidatePlausible) {
      // Correct this sample immediately, but only when both the ratio test and
      // the scored candidate test agree. That is the key false-positive guard.
      correctThisSampleAsDoubled = true;
      if (doubleHits < kDetectionHitsRequired)
        doubleHits++;
      equalHits = 0;
    } else if (equalRatioPlausible && rawCandidatePlausible) {
      correctThisSampleAsDoubled = false;
      if (equalHits < kDetectionHitsRequired)
        equalHits++;
      doubleHits = 0;
    } else {
      // Ambiguous/noisy sample: keep using the last confirmed mode, but do not
      // learn from it.
      equalHits = 0;
      doubleHits = 0;
    }

    if (doubleHits >= kDetectionHitsRequired) {
      leftTachIsDoubled = true;
    } else if (equalHits >= kDetectionHitsRequired) {
      leftTachIsDoubled = false;
    }
  } else {
    // Pivots, aggressive turns, command transients, and very low speeds are not
    // trustworthy for detecting a 2x tach fault. Keep the existing mode only.
    equalHits = 0;
    doubleHits = 0;
  }

  const float correctedLeftMph =
      correctThisSampleAsDoubled ? rawLeftMph * 0.5f : rawLeftMph;

  // The EZ Drive tach output is a magnitude-only pulse train, so encoder
  // pulses cannot tell us which way the wheel is turning. Latch the sign of
  // the last non-zero commanded ref speed per side and apply it to the
  // measured magnitude. This keeps /motor_speed signed during coast-down
  // after the operator releases the stick.
  static int8_t leftDirSign = 1;
  static int8_t rightDirSign = 1;
  if (refSpeedSensors.leftSpeed > kStoppedCommandThreshold)
    leftDirSign = 1;
  else if (refSpeedSensors.leftSpeed < -kStoppedCommandThreshold)
    leftDirSign = -1;
  if (refSpeedSensors.rightSpeed > kStoppedCommandThreshold)
    rightDirSign = 1;
  else if (refSpeedSensors.rightSpeed < -kStoppedCommandThreshold)
    rightDirSign = -1;

  const float signedRightMph = rightDirSign * rawRightMph;
  const float signedLeftMph = leftDirSign * correctedLeftMph;

  const bool commandedStopped =
      fabsf(refSpeedSensors.leftSpeed) <= kStoppedCommandThreshold &&
      fabsf(refSpeedSensors.rightSpeed) <= kStoppedCommandThreshold;

  const bool correctionModeChanged =
      correctThisSampleAsDoubled != previousSampleWasCorrectedAsDoubled;
  previousSampleWasCorrectedAsDoubled = correctThisSampleAsDoubled;

  if (!smoothingInitialized || commandedStopped) {
    speedR = commandedStopped ? 0.0f : signedRightMph;
    speedL = commandedStopped ? 0.0f : signedLeftMph;
    smoothingInitialized = true;
  } else {
    speedR += kOutputSmoothingAlpha * (signedRightMph - speedR);
    if (correctionModeChanged) {
      // Do not let the output smoother leak a full-size doubled sample for a
      // second or two after the detector flips modes.  Snap only the affected
      // left channel to the newly selected candidate, then continue smoothing.
      speedL = signedLeftMph;
    } else {
      speedL += kOutputSmoothingAlpha * (signedLeftMph - speedL);
    }
  }

  if (commandedStopped) {
    hasPreviousCorrectedLeftMph = false;
    previousCorrectedLeftMph = 0.0f;
  } else {
    hasPreviousCorrectedLeftMph = true;
    previousCorrectedLeftMph = correctedLeftMph;
  }

  freqSampleStart = millis();
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
