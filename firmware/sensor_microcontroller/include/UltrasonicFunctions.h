//
// Created by Robbie on 12/3/24.
//

#ifndef JOYSTICK_ULTRASONICFUNCTIONS_H
#define JOYSTICK_ULTRASONICFUNCTIONS_H
#include <Adafruit_ADS1X15.h>

struct USData {
    int us_front_0;
    int us_front_1;
    int us_back;
    int us_left;
    int us_right;
};

/**
 * Returns the distance read by an ultrasonic sensor.
 * @param adc An instance of the ADC that the sensor is attached to.
 * @param pinNumber The pin number of the ADC that the sensor is attached to.
 * @return Returns the distance on the ultrasonic sensor, measured in cm. Returns -1 if the pin is misconfigured.
 */
int ultrasonicDistance(Adafruit_ADS1115 &adc, uint8_t pinNumber);

/**
 * Returns vales from all the ultrasonic sensors. Requires 2 ADCs to work
 * @param adc0 The ADC for the joystick and single ultrasonic sensor
 * @param adc1 The dedicate ADC for other ultrasonic sensors
 * @return Returns an USData struct containing the values from all the ultrasonic sensors
 */
USData allUltrasonicDistance(Adafruit_ADS1115 &adc0, Adafruit_ADS1115 &adc1);

/**
 * Reads every ultrasonic channel that has an available ADC. Missing channels
 * keep the default value of -1 so downstream code can distinguish unavailable
 * sensors from real zero-distance readings.
 */
USData readUltrasonicSensors(Adafruit_ADS1115 *joystickAdc,
                             Adafruit_ADS1115 *ultrasonicAdc);

#endif //JOYSTICK_ULTRASONICFUNCTIONS_H
