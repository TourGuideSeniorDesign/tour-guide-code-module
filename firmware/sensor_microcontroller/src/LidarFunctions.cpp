//
// Created by Robbie on 4/9/25.
//

#include <Arduino.h>
#include "LidarFunctions.h"

void setupLidar(){
    pinMode(LIDAR_PIN, OUTPUT);
    lidarState(false);
}

void lidarState(boolean status){
    if(status){
        digitalWrite(LIDAR_PIN, HIGH);
    } else {
        digitalWrite(LIDAR_PIN, LOW);
    }
}