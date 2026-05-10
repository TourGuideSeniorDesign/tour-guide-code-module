#include "ADCFunctions.h"
#include "FanFunctions.h"
#include "FingerprintFunctions.h"
#include "IMUFunctions.h"
#include "JoystickFunctions.h"
#include "LidarFunctions.h"
#include "LightFunctions.h"
#include "PIRFunctions.h"
#include "SensorModule.h"
#include "UltrasonicFunctions.h"
#include "debug.h"
#include <Adafruit_ADS1X15.h>
#include <Adafruit_ICM20948.h>
#include <Wire.h>
#include <hardware/watchdog.h>

#if defined(ROS) || defined(ROS_DEBUG)
#include <microRosFunctions.h>
#include <micro_ros_platformio.h>
#endif

namespace {
constexpr unsigned long SERIAL_WAIT_MS = 2000;
constexpr unsigned long SENSOR_RETRY_INTERVAL_MS = 10000;
constexpr unsigned long FINGERPRINT_INTERVAL_MS = 5000;
constexpr unsigned long ERROR_PUBLISH_INTERVAL_MS = 5000;
constexpr uint8_t FINGERPRINT_NO_EVENT = 2;

Adafruit_ADS1115 joystickAdc;
Adafruit_ADS1115 ultrasonicAdc;
Adafruit_ICM20948 icm;

SensorModule joystickAdcModule{"joystick_adc", SensorState::Uninitialized, 0,
                               SENSOR_RETRY_INTERVAL_MS};
SensorModule ultrasonicAdcModule{"ultrasonic_adc", SensorState::Uninitialized,
                                 0, SENSOR_RETRY_INTERVAL_MS};
SensorModule fingerprintModule{"fingerprint", SensorState::Uninitialized, 0,
                               SENSOR_RETRY_INTERVAL_MS};
SensorModule imuModule{"imu", SensorState::Uninitialized, 0,
                       SENSOR_RETRY_INTERVAL_MS};

unsigned long lastFingerprintTime = 0;
unsigned long lastErrorTime = 0;

void waitForSerial(unsigned long timeoutMs) {
  const unsigned long startMs = millis();
  while (!Serial && (millis() - startMs) < timeoutMs) {
    delay(10);
  }
}

void applyInitResult(SensorModule &module, bool initFailed) {
  if (initFailed) {
    markSensorOffline(module, millis());
  } else {
    markSensorOnline(module);
  }
  logSensorStatus(module);
}

void initializeOptionalSensors() {
  applyInitResult(ultrasonicAdcModule, adcInit(ultrasonicAdc, 0x49));
  applyInitResult(joystickAdcModule, adcInit(joystickAdc, 0x48));
  applyInitResult(imuModule, imuInit(icm, ICM20948_ACCEL_RANGE_2_G,
                                     ICM20948_GYRO_RANGE_250_DPS,
                                     AK09916_MAG_DATARATE_10_HZ));
  applyInitResult(fingerprintModule, setupFingerprint());
}

void retryOfflineSensors(unsigned long now) {
  if (ultrasonicAdcModule.shouldRetry(now)) {
    applyInitResult(ultrasonicAdcModule, adcInit(ultrasonicAdc, 0x49));
  }
  if (joystickAdcModule.shouldRetry(now)) {
    applyInitResult(joystickAdcModule, adcInit(joystickAdc, 0x48));
  }
  if (imuModule.shouldRetry(now)) {
    applyInitResult(imuModule, imuInit(icm, ICM20948_ACCEL_RANGE_2_G,
                                       ICM20948_GYRO_RANGE_250_DPS,
                                       AK09916_MAG_DATARATE_10_HZ));
  }
  if (fingerprintModule.shouldRetry(now)) {
    applyInitResult(fingerprintModule, setupFingerprint());
  }
}

bool joystickAdcError() { return !joystickAdcModule.available(); }
bool ultrasonicAdcError() { return !ultrasonicAdcModule.available(); }
bool fingerprintError() { return !fingerprintModule.available(); }
bool imuError() { return !imuModule.available(); }
} // namespace

void setup() {
  Serial.begin(115200);
  waitForSerial(SERIAL_WAIT_MS);
  DEBUG_PRINTLN("Sensor microcontroller booting");

  setupLidar();
  lidarState(true); // Enable LiDAR at start so it can grab the SDK correctly.

  FanDutyCycles startDutyCycles{};
  setAllFans(startDutyCycles);

#ifdef ROS
  set_microros_serial_transports(Serial);
  delay(2000);
#elif ROS_DEBUG
  const char *nodeName = "sensors_node";
  const char *topicName = "refSpeed";
  while (!microRosSetup(1, nodeName, topicName)) {
    delay(100);
  }
#endif

  // Do not enable the watchdog until after the potentially slow / blocking
  // peripheral initialization below.
  initializeOptionalSensors();

  setAllFans(startDutyCycles);
  setupRPMCounter();
  setupLight();
  setupPIR();

  watchdog_enable(5000, 1);
  watchdog_update();

#ifdef ROS
  if (joystickAdcError() || ultrasonicAdcError() || fingerprintError() ||
      imuError()) {
    publishError(joystickAdcError(), ultrasonicAdcError(), fingerprintError(),
                 imuError());
    lastErrorTime = millis();
  }
#endif
}

void loop() {
  const unsigned long currentMillis = millis();
  retryOfflineSensors(currentMillis);

  RefSpeed omegaRef{};
  RefDisplacement thetaRef{};
  if (joystickAdcModule.available()) {
    omegaRef = joystickToSpeed(joystickAdc);
    thetaRef = joystickToDisplacement(joystickAdc);
  }

  USData usDistances = readUltrasonicSensors(
      joystickAdcModule.available() ? &joystickAdc : nullptr,
      ultrasonicAdcModule.available() ? &ultrasonicAdc : nullptr);

  PIRSensors pirSensors = readAllPIR();

  IMUData imuData{};
  if (imuModule.available()) {
    imuData = getIMUData(icm);
  }

  FanSpeeds fanSpeeds = getAllFanSpeeds();

  uint8_t fingerID = FINGERPRINT_NO_EVENT;
  if (currentMillis - lastFingerprintTime >= FINGERPRINT_INTERVAL_MS) {
    lastFingerprintTime = currentMillis;
    if (fingerprintModule.available()) {
      fingerID = getFingerprintID();
    }
  }

  watchdog_update();

#ifdef ROS
  microRosTick();

  transmitMsg(thetaRef, omegaRef, usDistances, pirSensors, fanSpeeds, imuData);

  if (currentMillis - lastErrorTime >= ERROR_PUBLISH_INTERVAL_MS) {
    lastErrorTime = currentMillis;
    publishError(joystickAdcError(), ultrasonicAdcError(), fingerprintError(),
                 imuError());
  }

  if (fingerID != FINGERPRINT_NO_EVENT) {
    publishFingerprint(fingerID);
  }
#elif ROS_DEBUG
  transmitMsg(thetaRef, omegaRef);
#elif DEBUG
  Serial.print("Fan0 Speed: ");
  Serial.println(fanSpeeds.fan_speed_0);
  Serial.print("Fan1 Speed: ");
  Serial.println(fanSpeeds.fan_speed_1);
  Serial.print("Fan2 Speed: ");
  Serial.println(fanSpeeds.fan_speed_2);
  Serial.print("Fan3 Speed: ");
  Serial.println(fanSpeeds.fan_speed_3);
  Serial.print("Right Speed: ");
  Serial.println(omegaRef.rightSpeed);
  Serial.print("Left Speed: ");
  Serial.println(omegaRef.leftSpeed);
  Serial.print("Ultrasonic front 0: ");
  Serial.println(usDistances.us_front_0);
  Serial.print("Ultrasonic front 1: ");
  Serial.println(usDistances.us_front_1);
  Serial.print("Ultrasonic back: ");
  Serial.println(usDistances.us_back);
  Serial.print("Ultrasonic left: ");
  Serial.println(usDistances.us_left);
  Serial.print("Ultrasonic right: ");
  Serial.println(usDistances.us_right);

  Serial.print("Accel X: ");
  Serial.print(imuData.accel_x);
  Serial.print(" \tY: ");
  Serial.print(imuData.accel_y);
  Serial.print(" \tZ: ");
  Serial.println(imuData.accel_z);

  Serial.print("Gyro X: ");
  Serial.print(imuData.gyro_x);
  Serial.print(" \tY: ");
  Serial.print(imuData.gyro_y);
  Serial.print(" \tZ: ");
  Serial.println(imuData.gyro_z);

  Serial.print("Mag X: ");
  Serial.print(imuData.mag_x);
  Serial.print(" \tY: ");
  Serial.print(imuData.mag_y);
  Serial.print(" \tZ: ");
  Serial.println(imuData.mag_z);
#endif
}
