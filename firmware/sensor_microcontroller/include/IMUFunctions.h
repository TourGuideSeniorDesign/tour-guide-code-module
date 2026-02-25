//
// Created by Robbie on 11/13/24.
//

#ifndef JOYSTICKIMUDEMO_IMUFUNCTIONS_H
#define JOYSTICKIMUDEMO_IMUFUNCTIONS_H

#include <Arduino.h>
#include <Adafruit_ICM20948.h>

struct IMUData {
    float accel_x;
    float accel_y;
    float accel_z;
    float gyro_x;
    float gyro_y;
    float gyro_z;
    float mag_x;
    float mag_y;
    float mag_z;
};

/**
 * Initializes the IMU with the given parameters
 * @param icm - An instance of the Adafruit_ICM20948 class for the IMU
 * @param accelRang - The range of the accelerometer using the icm20948_accel_range_t enum
 * @param gyroRang  - The range of the gyroscope using the icm20948_gyro_range_t enum
 * @param magDataRate - The data rate of the magnetometer using the ak09916_data_rate_t enum
 */
bool imuInit(Adafruit_ICM20948 &icm, icm20948_accel_range_t accelRang, icm20948_gyro_range_t gyroRang, ak09916_data_rate_t magDataRate);

/**
 * Prints the IMU data to the serial monitor
 * @param icm - An instance of the Adafruit_ICM20948 class for the IMU
 */
void printImuData(Adafruit_ICM20948 &icm);

/**
 * Returns a IMUData struct with updated values from the IMU.
 * @param icm - An instance of the Adafruit_ICM20948 class for the IMU
 * @return Returns an IMUData struct with the values from the IMU at call time.
 */
IMUData getIMUData(Adafruit_ICM20948 &icm);

#endif //JOYSTICKIMUDEMO_IMUFUNCTIONS_H
