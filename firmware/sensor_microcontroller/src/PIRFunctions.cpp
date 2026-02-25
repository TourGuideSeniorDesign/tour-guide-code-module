//
// Functions created by Nam
// Modified by Robbie
//

#include <Arduino.h>
#include "PIRFunctions.h"

//TODO figure out if we need to add an extra PIR sensor attached to the joystick DAC

void setupPIR() {
    pinMode(PIR_0, INPUT); // initialize sensor as an input
    pinMode(PIR_1, INPUT); // initialize sensor as an input
    pinMode(PIR_2, INPUT); // initialize sensor as an input
    pinMode(PIR_3, INPUT); // initialize sensor as an input
    Serial.println("PIR detected");
}

bool readPIRSingle(uint8_t pirPin) {
    return digitalRead(pirPin);
}

PIRSensors readAllPIR() {
    PIRSensors pir_sensors{};
    pir_sensors.pir0 = digitalRead(PIR_0);
    pir_sensors.pir1 = digitalRead(PIR_1);
    pir_sensors.pir2 = digitalRead(PIR_2);
    pir_sensors.pir3 = digitalRead(PIR_3);
    return pir_sensors;
}