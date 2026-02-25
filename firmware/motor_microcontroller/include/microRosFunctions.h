//
// Created by leslier on 12/8/2024.
//

#ifndef MOTORMICROCONTROLLER_MICROROSFUNCTIONS_H
#define MOTORMICROCONTROLLER_MICROROSFUNCTIONS_H

#include <Arduino.h>
#include "RefSpeed.h"

extern bool eBrake;


bool create_entities();

void destroy_entities();

void microRosTick();

/**
 * Transmits the message over ROS. Not in use right now
 * @param /
 */
//void transmitMsg();


/**
 * Function to get the reference speed from the ROS topic.
 * @return The reference speed using the refSpeed struct.
 */
refSpeed getRefSpeed();


void transmitDac(int16_t leftDacValue, int16_t rightDacValue);

#endif //MOTORMICROCONTROLLER_MICROROSFUNCTIONS_H
