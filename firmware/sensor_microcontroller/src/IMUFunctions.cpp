//
// Created by Robbie on 11/13/24.
//

#include "IMUFunctions.h"

#include <Arduino.h>
#include <Adafruit_ICM20X.h>
#include <Adafruit_ICM20948.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>


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
        // if (!icm.begin_SPI(ICM_CS)) {
        // if (!icm.begin_SPI(ICM_CS, ICM_SCK, ICM_MISO, ICM_MOSI)) {

        Serial.println("Failed to find ICM20948 chip");
        if (init_count > 10) {
            return true;
        }
        init_count++;
    }


    Serial.println("ICM20948 Found!");
    icm.setAccelRange(accelRang);
    Serial.print("Accelerometer range set to: ");
    switch (icm.getAccelRange()) {
        case ICM20948_ACCEL_RANGE_2_G:
            Serial.println("+-2G");
            break;
        case ICM20948_ACCEL_RANGE_4_G:
            Serial.println("+-4G");
            break;
        case ICM20948_ACCEL_RANGE_8_G:
            Serial.println("+-8G");
            break;
        case ICM20948_ACCEL_RANGE_16_G:
            Serial.println("+-16G");
            break;
    }
    Serial.println("OK");

    icm.setGyroRange(gyroRang);
    Serial.print("Gyro range set to: ");
    switch (icm.getGyroRange()) {
        case ICM20948_GYRO_RANGE_250_DPS:
            Serial.println("250 degrees/s");
            break;
        case ICM20948_GYRO_RANGE_500_DPS:
            Serial.println("500 degrees/s");
            break;
        case ICM20948_GYRO_RANGE_1000_DPS:
            Serial.println("1000 degrees/s");
            break;
        case ICM20948_GYRO_RANGE_2000_DPS:
            Serial.println("2000 degrees/s");
            break;
    }

    //  icm.setAccelRateDivisor(4095);
    uint16_t accel_divisor = icm.getAccelRateDivisor();
    float accel_rate = 1125 / (1.0 + accel_divisor);

    Serial.print("Accelerometer data rate divisor set to: ");
    Serial.println(accel_divisor);
    Serial.print("Accelerometer data rate (Hz) is approximately: ");
    Serial.println(accel_rate);

    //  icm.setGyroRateDivisor(255);
    uint8_t gyro_divisor = icm.getGyroRateDivisor();
    float gyro_rate = 1100 / (1.0 + gyro_divisor);

    Serial.print("Gyro data rate divisor set to: ");
    Serial.println(gyro_divisor);
    Serial.print("Gyro data rate (Hz) is approximately: ");
    Serial.println(gyro_rate);

    icm.setMagDataRate(magDataRate);
    Serial.print("Magnetometer data rate set to: ");
    switch (icm.getMagDataRate()) {
        case AK09916_MAG_DATARATE_SHUTDOWN:
            Serial.println("Shutdown");
            break;
        case AK09916_MAG_DATARATE_SINGLE:
            Serial.println("Single/One shot");
            break;
        case AK09916_MAG_DATARATE_10_HZ:
            Serial.println("10 Hz");
            break;
        case AK09916_MAG_DATARATE_20_HZ:
            Serial.println("20 Hz");
            break;
        case AK09916_MAG_DATARATE_50_HZ:
            Serial.println("50 Hz");
            break;
        case AK09916_MAG_DATARATE_100_HZ:
            Serial.println("100 Hz");
            break;
    }
    Serial.println();
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

    Serial.print("Temperature ");
    Serial.print(temp.temperature);
    Serial.println(" deg C");

    /* Display the results (acceleration is measured in m/s^2) */
    Serial.print("Accel X: ");
    Serial.print(accel.acceleration.x);
    Serial.print(" \tY: ");
    Serial.print(accel.acceleration.y);
    Serial.print(" \tZ: ");
    Serial.print(accel.acceleration.z);
    Serial.println(" m/s^2 ");

    Serial.print("Mag X: ");
    Serial.print(mag.magnetic.x);
    Serial.print(" \tY: ");
    Serial.print(mag.magnetic.y);
    Serial.print(" \tZ: ");
    Serial.print(mag.magnetic.z);
    Serial.println(" uT");

    /* Display the results (acceleration is measured in m/s^2) */
    Serial.print("Gyro X: ");
    Serial.print(gyro.gyro.x);
    Serial.print(" \tY: ");
    Serial.print(gyro.gyro.y);
    Serial.print(" \tZ: ");
    Serial.print(gyro.gyro.z);
    Serial.println(" radians/s ");
    Serial.println();


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

