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
    int8_t leftSpeed{};      ///< Speed of the left wheel.
    int8_t rightSpeed{};     ///< Speed of the right wheel.
};


#endif //MOTORMICROCONTROLLER_REFSPEED_H
