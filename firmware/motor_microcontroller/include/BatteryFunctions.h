//
// Created by Laxman on 4/9/25.
//

#ifndef BATTERYFUNCTIONS_H
#define BATTERYFUNCTIONS_H

#include <Arduino.h>
#include "hardware/adc.h"

// ADC pin and configuration
#define ADC_PIN 28
#define VREF 3.3
#define ADC_MAX 4095.0
#define OPAMP_GAIN 10.1
#define VOLTAGE_DIVIDER_RATIO 0.01205

// Battery voltage range
#define BATTERY_VOLTAGE_MAX 27.0
#define BATTERY_VOLTAGE_MIN 21.0

void initBatterySensor();
float readBatteryVoltage();
int8_t calculateBatteryPercentage(float battery_voltage);

#endif // BATTERYFUNCTIONS_H

