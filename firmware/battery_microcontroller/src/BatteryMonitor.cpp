#include "BatteryMonitor.h"
#include "debug.h"
#include <Wire.h>
#include <Adafruit_INA228.h>
#include <kvstore_global_api.h>

static Adafruit_INA228 ina228;

static const char *PERSIST_KEY = "/kv/battery_state";

// Main battery state
static float consumedAh = 0.0;
static float lastVoltage = 0.0;
static float lastCurrentAmps = 0.0;
static float lastBatteryPercent = 0.0;
static unsigned long lastSampleMs = 0;
static unsigned long lastSaveMs = 0;
static uint16_t fullVoltageSampleCount = 0;
static uint16_t emptyVoltageSampleCount = 0;

// Internal helpers
static float clampConsumedAh(float value);
static float calculateBatteryPercent();
static uint32_t calculateChecksum(const PersistedState &state);
static PersistedState buildPersistedState();
static bool persistedStateIsValid(const PersistedState &state);
static bool stateAlreadySaved(const PersistedState &state);
static Measurement readMeasurement();
static float secondsSinceLastSample(unsigned long nowMs);
static void integrateCurrent(float currentAmps, float deltaSeconds);
static bool applyVoltageLandmarks(float voltage);
static void restorePersistedState();

void initBatteryMonitor() {
  if (!ina228.begin()) {
    DEBUG_PRINTLN("INA228 not found.");
    saveStateNow(true);
    while (1) {
      delay(100);
    }
  }

  ina228.setShunt(SHUNT_OHMS, MAX_CURRENT_AMPS);

  DEBUG_PRINTLN("Battery monitor active.");

  restorePersistedState();

  lastSampleMs = millis();
  lastSaveMs = lastSampleMs;
}

void updateBatteryReadings() {
  unsigned long nowMs = millis();
  float deltaSeconds = secondsSinceLastSample(nowMs);
  Measurement measurement = readMeasurement();

  lastVoltage = measurement.voltage;
  lastCurrentAmps = measurement.currentAmps;

  integrateCurrent(measurement.currentAmps, deltaSeconds);

  bool landmarkChangedState = applyVoltageLandmarks(measurement.voltage);
  lastBatteryPercent = calculateBatteryPercent();

  if (landmarkChangedState) {
    saveStateNow(true);
    lastSaveMs = nowMs;
  }

  if (nowMs - lastSaveMs >= SAVE_INTERVAL_MS) {
    saveStateIfNeeded();
    lastSaveMs = nowMs;
  }
}

float getVoltage() {
  return lastVoltage;
}

float getCurrentAmps() {
  return lastCurrentAmps;
}

float getConsumedAh() {
  return consumedAh;
}

float getBatteryPercent() {
  return lastBatteryPercent;
}

static void restorePersistedState() {
  PersistedState savedState;
  size_t actualSize = 0;
  int result = kv_get(PERSIST_KEY, &savedState, sizeof(savedState), &actualSize);

  if (result == 0 && actualSize == sizeof(savedState) && persistedStateIsValid(savedState)) {
    consumedAh = clampConsumedAh(savedState.consumedAh);
    DEBUG_PRINT("Restored consumedAh=");
    DEBUG_PRINTLN(consumedAh);
    return;
  }

  consumedAh = 0.0;
  DEBUG_PRINTLN("No valid saved consumedAh found.");
}

static Measurement readMeasurement() {
  Measurement measurement;
  measurement.voltage = ina228.readBusVoltage();
  measurement.currentAmps = ina228.readCurrent() / 1000.0;
  return measurement;
}

static float secondsSinceLastSample(unsigned long nowMs) {
  float deltaSeconds = (nowMs - lastSampleMs) / 1000.0;
  lastSampleMs = nowMs;
  return deltaSeconds;
}

static void integrateCurrent(float currentAmps, float deltaSeconds) {
  float deltaAh = (currentAmps * deltaSeconds) / 3600.0;
  consumedAh = clampConsumedAh(consumedAh + deltaAh);
}

static bool applyVoltageLandmarks(float voltage) {
  if (voltage > VOLTAGE_FULL_RESET) {
    if (fullVoltageSampleCount < VOLTAGE_LANDMARK_SAMPLES_REQUIRED) {
      fullVoltageSampleCount++;
    }
    emptyVoltageSampleCount = 0;

    if (fullVoltageSampleCount >= VOLTAGE_LANDMARK_SAMPLES_REQUIRED &&
        consumedAh != 0.0) {
      consumedAh = 0.0;
      DEBUG_PRINTLN("Voltage held above full threshold. Reset consumedAh to 0.");
      return true;
    }
    return false;
  }

  if (voltage < VOLTAGE_EMPTY_RESET) {
    if (emptyVoltageSampleCount < VOLTAGE_LANDMARK_SAMPLES_REQUIRED) {
      emptyVoltageSampleCount++;
    }
    fullVoltageSampleCount = 0;

    if (emptyVoltageSampleCount >= VOLTAGE_LANDMARK_SAMPLES_REQUIRED &&
        consumedAh != TOTAL_BATTERY_CAPACITY_AH) {
      consumedAh = TOTAL_BATTERY_CAPACITY_AH;
      DEBUG_PRINTLN("Voltage held below empty threshold. Reset consumedAh to empty.");
      return true;
    }
    return false;
  }

  fullVoltageSampleCount = 0;
  emptyVoltageSampleCount = 0;
  return false;
}

static float clampConsumedAh(float value) {
  if (value < 0.0) return 0.0;
  if (value > TOTAL_BATTERY_CAPACITY_AH) return TOTAL_BATTERY_CAPACITY_AH;
  return value;
}

static float calculateBatteryPercent() {
  float remainingAh = TOTAL_BATTERY_CAPACITY_AH - consumedAh;
  float percent = (remainingAh / TOTAL_BATTERY_CAPACITY_AH) * 100.0;
  if (percent > 100.0) return 100.0;
  if (percent < 0.0) return 0.0;
  return percent;
}

static uint32_t calculateChecksum(const PersistedState &state) {
  uint32_t consumedAhBits = 0;
  memcpy(&consumedAhBits, &state.consumedAh, sizeof(consumedAhBits));
  return state.magic ^ state.version ^ consumedAhBits ^ 0xA5A5A5A5;
}

static PersistedState buildPersistedState() {
  PersistedState state;
  state.magic = PERSIST_MAGIC;
  state.version = PERSIST_VERSION;
  state.consumedAh = clampConsumedAh(consumedAh);
  state.checksum = calculateChecksum(state);
  return state;
}

static bool persistedStateIsValid(const PersistedState &state) {
  return state.magic == PERSIST_MAGIC &&
         state.version == PERSIST_VERSION &&
         state.checksum == calculateChecksum(state);
}

static bool stateAlreadySaved(const PersistedState &state) {
  PersistedState existingState;
  size_t actualSize = 0;
  int result = kv_get(PERSIST_KEY, &existingState, sizeof(existingState), &actualSize);

  if (result != 0 || actualSize != sizeof(existingState)) {
    return false;
  }

  return existingState.magic == state.magic &&
         existingState.version == state.version &&
         existingState.checksum == state.checksum;
}

void saveStateIfNeeded(bool logSave) {
  PersistedState state = buildPersistedState();

  if (stateAlreadySaved(state)) {
    return;
  }

  kv_set(PERSIST_KEY, &state, sizeof(state), 0);

  if (logSave) {
    DEBUG_PRINT("Saved consumedAh=");
    DEBUG_PRINTLN(state.consumedAh);
  }
}

void saveStateNow(bool logSave) {
  saveStateIfNeeded(logSave);
}
