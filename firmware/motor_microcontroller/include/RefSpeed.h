//
// Created by Robbie on 12/8/24.
//

#ifndef MOTORMICROCONTROLLER_REFSPEED_H
#define MOTORMICROCONTROLLER_REFSPEED_H

#include <Arduino.h>

/**
 * Struct representing the reference speed and direction.
 */
struct refSpeed {
    float leftSpeed{};       ///< Speed of the left wheel.
    float rightSpeed{};      ///< Speed of the right wheel.
};


#endif //MOTORMICROCONTROLLER_REFSPEED_H
