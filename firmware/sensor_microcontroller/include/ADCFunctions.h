//
// Created by Robbie on 11/14/24.
//

#ifndef JOYSTICKIMUDEMO_ADCFUNCTIONS_H
#define JOYSTICKIMUDEMO_ADCFUNCTIONS_H

#include <Arduino.h>
#include <Adafruit_ADS1X15.h>

/**
 * Initializes the ADC with the given parameters
 * @param adc - An instance of the Adafruit_ADS1115 class for the ADC
 * @param i2c_addr - The I2C address of the ADC in hex
 */
bool adcInit(Adafruit_ADS1115 &adc, uint8_t i2c_addr);

/***
 * Prints the ADC data to the serial monitor
 * @param adc - An instance of the Adafruit_ADS1115 class for the ADC
 */
void printADC(Adafruit_ADS1115 &adc);

#endif //JOYSTICKIMUDEMO_ADCFUNCTIONS_H
