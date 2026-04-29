#ifndef BATTERYMONITOR_H
#define BATTERYMONITOR_H

#include <Arduino.h>

// Battery and sensor configuration
#define TOTAL_BATTERY_CAPACITY_AH 60.f
#define SHUNT_OHMS 0.001f
#define MAX_CURRENT_AMPS 1.0f

// Voltage landmarks used to re-sync the coulomb counter
#define VOLTAGE_FULL_RESET 29.2f
#define VOLTAGE_EMPTY_RESET 22.0f // 22V is the operational minimum voltage for the battery pack
#define VOLTAGE_LANDMARK_SAMPLES_REQUIRED 100

// Flash persistence settings
#define SAVE_INTERVAL_MS 6000UL
#define PERSIST_MAGIC 0x42415431 // "BAT1" in hex
#define PERSIST_VERSION 1

struct PersistedState {
  uint32_t magic;
  uint32_t version;
  float consumedAh;
  uint32_t checksum;
};

struct Measurement {
  float voltage;
  float currentAmps;
};

void initBatteryMonitor();
void updateBatteryReadings();
void saveStateIfNeeded(bool logSave = false);
void saveStateNow(bool logSave = false);

float getVoltage();
float getCurrentAmps();
float getConsumedAh();
float getBatteryPercent();

#endif // BATTERYMONITOR_H
