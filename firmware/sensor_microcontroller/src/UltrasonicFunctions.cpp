//
// Created by Robbie on 12/3/24.
//

#include "UltrasonicFunctions.h"
#include <Adafruit_ADS1X15.h>
#include "ADCFunctions.h"
#include "debug.h"

//TODO tune these numbers to get a more accurate reading
#define  MAX_RANG      (520)//the max measurement value of the module is 520cm(a little bit longer than  effective max range)
#define ADC_SOLUTION 26230 //Max value for a 16 bit dac at 3.3V

//Distance Formula: Distance=Vout(mV)×520/Vin(mV)



int ultrasonicDistance(Adafruit_ADS1115 &adc, uint8_t pinNumber){
    if(pinNumber > 3){
        DEBUG_PRINTLN("Please select a pin between 0 and 3");
        return -1;
    }
    //int distance = bitToMv(adc, pinNumber) * MAX_RANG / ADC_SOLUTION;
    int distance = adc.readADC_SingleEnded(pinNumber) * MAX_RANG / ADC_SOLUTION;

#ifdef DEBUG
    // Serial.print("Raw Reading: ");
    // Serial.println(adc.readADC_SingleEnded(pinNumber));
    // Serial.print("Ultrasonic Distance: ");
    // Serial.println(distance);
#endif
    return distance;
}

//adc0 is joystick and adc1 is dedicated ADC
USData allUltrasonicDistance(Adafruit_ADS1115 &adc0, Adafruit_ADS1115 &adc1){
    return readUltrasonicSensors(&adc0, &adc1);
}

USData readUltrasonicSensors(Adafruit_ADS1115 *joystickAdc,
                             Adafruit_ADS1115 *ultrasonicAdc) {
    USData usData{-1, -1, -1, -1, -1};

    if (joystickAdc != nullptr) {
        usData.us_front_0 = joystickAdc->readADC_SingleEnded(2) * MAX_RANG / ADC_SOLUTION;
    }

    if (ultrasonicAdc != nullptr) {
        usData.us_front_1 = ultrasonicAdc->readADC_SingleEnded(0) * MAX_RANG / ADC_SOLUTION;
        usData.us_back = ultrasonicAdc->readADC_SingleEnded(1) * MAX_RANG / ADC_SOLUTION;
        usData.us_left = ultrasonicAdc->readADC_SingleEnded(2) * MAX_RANG / ADC_SOLUTION;
        usData.us_right = ultrasonicAdc->readADC_SingleEnded(3) * MAX_RANG / ADC_SOLUTION;
    }

    return usData;
}