//
// Created by Robbie on 11/14/24.
//

#include "ADCFunctions.h"
#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include "debug.h"


/**
 * Initializes the ADC with the given parameters
 * @param adc - An instance of the Adafruit_ADS1115 class for the ADC
 * @param i2c_addr - The I2C address of the ADC in hex
 */
 bool adcInit(Adafruit_ADS1115 &adc, uint8_t i2c_addr){
    int adc_count = 0;

    //Initialize ADC
    while(!adc.begin(i2c_addr)){ // Initialize ads1115 at address 0x49
        DEBUG_PRINTLN("Failed to find ADS1115 chip at address " + String(i2c_addr, HEX));
        if (adc_count > 10) {
            return true;
        }
        adc_count++;
    }
    DEBUG_PRINTLN("ADS1115 Found!");
    adc.setGain(GAIN_ONE); //Setting the gain to +/- 4.096V  1 bit = 2mV for more precise readings
     return false;
}


/***
 * Prints the ADC data to the serial monitor
 * @param adc - An instance of the Adafruit_ADS1115 class for the ADC
 */
void printADC(Adafruit_ADS1115 &adc){
    //Get ADC data
    int16_t adc0, adc1, adc2, adc3;

    adc0 = adc.readADC_SingleEnded(0);
    adc1 = adc.readADC_SingleEnded(1);
    adc2 = adc.readADC_SingleEnded(2);
    adc3 = adc.readADC_SingleEnded(3);
    DEBUG_PRINT("AIN0: "); DEBUG_PRINTLN(adc0);
    DEBUG_PRINT("AIN1: "); DEBUG_PRINTLN(adc1);
    DEBUG_PRINT("AIN2: "); DEBUG_PRINTLN(adc2);
    DEBUG_PRINT("AIN3: "); DEBUG_PRINTLN(adc3);
    DEBUG_PRINTLN();
}