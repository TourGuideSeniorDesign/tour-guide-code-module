//
// Created by Robbie on 2/5/25.
//

#ifndef PWMFUNCTIONS_H
#define PWMFUNCTIONS_H

#include <Arduino.h>



/**
 * Sets the PWM level at the specified pin to the frequency and duty cycle selected
 * @param pin - the GPIO pin to use for PWM (must be a compatible pin)
 * @param frequency - The PWM frequency
 * @param duty_cycle - The duty cycle in percent
 */
void setPWM(uint pin, float frequency, float duty_cycle);

#endif //PWMFUNCTIONS_H
