//
// Created by Robbie on 2/9/25.
//

#include <Arduino.h>
#include "FanFunctions.h"
#include "PWMFunctions.h"
#include "hardware/pio.h"

static float frequency = 25000;

static volatile uint32_t pulse_count_single = 0;
static uint32_t rpm_test = 0;
static volatile int16_t pulse_count[4] = {0, 0, 0, 0};
static volatile int16_t rpm[4] = {0, 0, 0, 0};

void setFanIndividual(uint8_t fan, uint8_t dutyCycle){
    setPWM(fan, frequency, dutyCycle);
}

void setAllFans(FanDutyCycles dutyCycles){
    setPWM(FAN_0, frequency, dutyCycles.fan_0_duty_cycle);
    setPWM(FAN_1, frequency, dutyCycles.fan_1_duty_cycle);
    setPWM(FAN_2, frequency, dutyCycles.fan_2_duty_cycle);
    setPWM(FAN_3, frequency, dutyCycles.fan_3_duty_cycle);
}

//TODO figure out how to read the actual fan speeds

static int16_t last_pulse_count_test[4] = {0, 0, 0, 0};
static uint32_t last_time_test[4] = {0, 0, 0, 0};

FanSpeeds getAllFanSpeeds() {
    FanSpeeds speeds{};

    uint32_t current_time = millis();
    for (uint8_t fanIndex = 0; fanIndex < 4; fanIndex++) {
        if (current_time - last_time_test[fanIndex] >= 1000) {  // Calculate RPM every second
            uint32_t pulses = pulse_count[fanIndex] - last_pulse_count_test[fanIndex];
            last_pulse_count_test[fanIndex] = pulse_count[fanIndex];
            last_time_test[fanIndex] = current_time;

            // Assuming the fan gives 2 pulses per revolution
            rpm[fanIndex] = (pulses * 60) / 2;
        }
    }

    speeds.fan_speed_0 = rpm[0];
    speeds.fan_speed_1 = rpm[1];
    speeds.fan_speed_2 = rpm[2];
    speeds.fan_speed_3 = rpm[3];

    return speeds;
}


void setupRPMCounter(){
    pinMode(TACH_0, INPUT);
    pinMode(TACH_1, INPUT);
    pinMode(TACH_2, INPUT);
    pinMode(TACH_3, INPUT);
    attachInterrupt(digitalPinToInterrupt(TACH_0), handleTach0Interrupt, FALLING);
    attachInterrupt(digitalPinToInterrupt(TACH_1), handleTach1Interrupt, FALLING);
    attachInterrupt(digitalPinToInterrupt(TACH_2), handleTach2Interrupt, FALLING);
    attachInterrupt(digitalPinToInterrupt(TACH_3), handleTach3Interrupt, FALLING);
}

static void handleTach0Interrupt() {
    pulse_count[0]++;
    pulse_count_single++;
}

static void handleTach1Interrupt() {
    pulse_count[1]++;
}

static void handleTach2Interrupt() {
    pulse_count[2]++;
}

static void handleTach3Interrupt() {
    pulse_count[3]++;
}

static uint32_t last_time = 0;
uint32_t getRPM(){
    static uint32_t last_pulse_count = 0;

    uint32_t current_time = millis();
    if (current_time - last_time >= 1000) {  // Calculate RPM every second
        uint32_t pulses = pulse_count_single - last_pulse_count;
        last_pulse_count = pulse_count_single;
        last_time = current_time;

        // Assuming the fan gives 2 pulses per revolution
        rpm_test = (pulses * 60) / 2;

    }
    return rpm_test;
}




