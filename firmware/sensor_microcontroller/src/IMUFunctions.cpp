//
// Created by Robbie on 11/13/24.
//

#include "IMUFunctions.h"

#include <Arduino.h>
#include "debug.h"
#include <Adafruit_ICM20X.h>
#include <Adafruit_ICM20948.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>
#include <hardware/watchdog.h>


/**
 * Initializes the IMU with the given parameters
 * @param icm - An instance of the Adafruit_ICM20948 class for the IMU
 * @param accelRang - The range of the accelerometer using the icm20948_accel_range_t enum
 * @param gyroRang  - The range of the gyroscope using the icm20948_gyro_range_t enum
 * @param magDataRate - The data rate of the magnetometer using the ak09916_data_rate_t enum
 */
bool imuInit(Adafruit_ICM20948 &icm, icm20948_accel_range_t accelRang, icm20948_gyro_range_t gyroRang, ak09916_data_rate_t magDataRate){
    int init_count = 0;
    // Try to initialize IMU!
    while (!icm.begin_I2C()) {
        watchdog_update();
        // if (!icm.begin_SPI(ICM_CS)) {
        // if (!icm.begin_SPI(ICM_CS, ICM_SCK, ICM_MISO, ICM_MOSI)) {

        DEBUG_PRINTLN("Failed to find ICM20948 chip");
        if (init_count >= 3) {
            return true;
        }
        init_count++;
    }


    DEBUG_PRINTLN("ICM20948 Found!");
    icm.setAccelRange(accelRang);
    DEBUG_PRINT("Accelerometer range set to: ");
    switch (icm.getAccelRange()) {
        case ICM20948_ACCEL_RANGE_2_G:
            DEBUG_PRINTLN("+-2G");
            break;
        case ICM20948_ACCEL_RANGE_4_G:
            DEBUG_PRINTLN("+-4G");
            break;
        case ICM20948_ACCEL_RANGE_8_G:
            DEBUG_PRINTLN("+-8G");
            break;
        case ICM20948_ACCEL_RANGE_16_G:
            DEBUG_PRINTLN("+-16G");
            break;
    }
    DEBUG_PRINTLN("OK");

    icm.setGyroRange(gyroRang);
    DEBUG_PRINT("Gyro range set to: ");
    switch (icm.getGyroRange()) {
        case ICM20948_GYRO_RANGE_250_DPS:
            DEBUG_PRINTLN("250 degrees/s");
            break;
        case ICM20948_GYRO_RANGE_500_DPS:
            DEBUG_PRINTLN("500 degrees/s");
            break;
        case ICM20948_GYRO_RANGE_1000_DPS:
            DEBUG_PRINTLN("1000 degrees/s");
            break;
        case ICM20948_GYRO_RANGE_2000_DPS:
            DEBUG_PRINTLN("2000 degrees/s");
            break;
    }

    //  icm.setAccelRateDivisor(4095);
#if !defined(ROS) && !defined(ROS_DEBUG)
    uint16_t accel_divisor = icm.getAccelRateDivisor();
    float accel_rate = 1125 / (1.0 + accel_divisor);
    DEBUG_PRINT("Accelerometer data rate divisor set to: ");
    DEBUG_PRINTLN(accel_divisor);
    DEBUG_PRINT("Accelerometer data rate (Hz) is approximately: ");
    DEBUG_PRINTLN(accel_rate);
#endif

    //  icm.setGyroRateDivisor(255);
#if !defined(ROS) && !defined(ROS_DEBUG)
    uint8_t gyro_divisor = icm.getGyroRateDivisor();
    float gyro_rate = 1100 / (1.0 + gyro_divisor);
    DEBUG_PRINT("Gyro data rate divisor set to: ");
    DEBUG_PRINTLN(gyro_divisor);
    DEBUG_PRINT("Gyro data rate (Hz) is approximately: ");
    DEBUG_PRINTLN(gyro_rate);
#endif

    icm.setMagDataRate(magDataRate);
    DEBUG_PRINT("Magnetometer data rate set to: ");
    switch (icm.getMagDataRate()) {
        case AK09916_MAG_DATARATE_SHUTDOWN:
            DEBUG_PRINTLN("Shutdown");
            break;
        case AK09916_MAG_DATARATE_SINGLE:
            DEBUG_PRINTLN("Single/One shot");
            break;
        case AK09916_MAG_DATARATE_10_HZ:
            DEBUG_PRINTLN("10 Hz");
            break;
        case AK09916_MAG_DATARATE_20_HZ:
            DEBUG_PRINTLN("20 Hz");
            break;
        case AK09916_MAG_DATARATE_50_HZ:
            DEBUG_PRINTLN("50 Hz");
            break;
        case AK09916_MAG_DATARATE_100_HZ:
            DEBUG_PRINTLN("100 Hz");
            break;
    }
    DEBUG_PRINTLN();
    return false;
}


/**
 * Prints the IMU data to the serial monitor
 * @param icm - An instance of the Adafruit_ICM20948 class for the IMU
 */
void printImuData(Adafruit_ICM20948 &icm){

    sensors_event_t accel;
    sensors_event_t gyro;
    sensors_event_t mag;
    sensors_event_t temp;
    icm.getEvent(&accel, &gyro, &temp, &mag);

    DEBUG_PRINT("Temperature ");
    DEBUG_PRINT(temp.temperature);
    DEBUG_PRINTLN(" deg C");

    /* Display the results (acceleration is measured in m/s^2) */
    DEBUG_PRINT("Accel X: ");
    DEBUG_PRINT(accel.acceleration.x);
    DEBUG_PRINT(" \tY: ");
    DEBUG_PRINT(accel.acceleration.y);
    DEBUG_PRINT(" \tZ: ");
    DEBUG_PRINT(accel.acceleration.z);
    DEBUG_PRINTLN(" m/s^2 ");

    DEBUG_PRINT("Mag X: ");
    DEBUG_PRINT(mag.magnetic.x);
    DEBUG_PRINT(" \tY: ");
    DEBUG_PRINT(mag.magnetic.y);
    DEBUG_PRINT(" \tZ: ");
    DEBUG_PRINT(mag.magnetic.z);
    DEBUG_PRINTLN(" uT");

    /* Display the results (acceleration is measured in m/s^2) */
    DEBUG_PRINT("Gyro X: ");
    DEBUG_PRINT(gyro.gyro.x);
    DEBUG_PRINT(" \tY: ");
    DEBUG_PRINT(gyro.gyro.y);
    DEBUG_PRINT(" \tZ: ");
    DEBUG_PRINT(gyro.gyro.z);
    DEBUG_PRINTLN(" radians/s ");
    DEBUG_PRINTLN();


    delay(100);
}

IMUData getIMUData(Adafruit_ICM20948 &icm){
    sensors_event_t accel;
    sensors_event_t gyro;
    sensors_event_t mag;
    sensors_event_t temp;
    icm.getEvent(&accel, &gyro, &temp, &mag);
    IMUData data{};
    data.accel_x = accel.acceleration.x;
    data.accel_y = accel.acceleration.y;
    data.accel_z = accel.acceleration.z;
    data.gyro_x = gyro.gyro.x;
    data.gyro_y = gyro.gyro.y;
    data.gyro_z = gyro.gyro.z;
    data.mag_x = mag.magnetic.x;
    data.mag_y = mag.magnetic.y;
    data.mag_z = mag.magnetic.z;

    return data;
}

