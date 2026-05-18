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
    float leftSpeed{};      ///< Speed of the left wheel (percent, -100.0 .. 100.0).
    float rightSpeed{};     ///< Speed of the right wheel (percent, -100.0 .. 100.0).
};


#endif //MOTORMICROCONTROLLER_REFSPEED_H
