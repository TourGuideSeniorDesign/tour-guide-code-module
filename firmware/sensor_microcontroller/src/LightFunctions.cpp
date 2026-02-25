//
// Created by aec117-fkmj9r3 on 3/11/25.
//

#include <Arduino.h>
#include "LightFunctions.h"

void setupLight(){
    pinMode(LIGHT_PIN_1, OUTPUT);
    pinMode(LIGHT_PIN_2, OUTPUT);
    setLight(0);
 }

 void setLight(int lightState){
    switch (lightState) {
        case 0:
            digitalWrite(LIGHT_PIN_1, LOW);
            digitalWrite(LIGHT_PIN_2, LOW);
        break;
        case 1:
            digitalWrite(LIGHT_PIN_1, LOW);
            digitalWrite(LIGHT_PIN_2, HIGH);
        break;
        case 2:
            digitalWrite(LIGHT_PIN_1, HIGH);
            digitalWrite(LIGHT_PIN_2, LOW);
        default:
            digitalWrite(LIGHT_PIN_1, HIGH);
            digitalWrite(LIGHT_PIN_2, LOW);
        break;
    }
 }