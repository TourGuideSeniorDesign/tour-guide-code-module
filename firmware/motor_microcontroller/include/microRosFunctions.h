#ifndef MOTORMICROCONTROLLER_MICROROSFUNCTIONS_H
#define MOTORMICROCONTROLLER_MICROROSFUNCTIONS_H

#include <Arduino.h>
#include "RefSpeed.h"

extern bool eBrake;

/** Advance the micro-ROS agent state machine and pump the executor. */
void microRosTick();

/** Latest ref_speed message received from the agent. */
refSpeed getRefSpeed();

/** Buffer the most recent commanded DAC values for the /dac_value publisher. */
void transmitDac(int16_t leftDacValue, int16_t rightDacValue);

#endif //MOTORMICROCONTROLLER_MICROROSFUNCTIONS_H
