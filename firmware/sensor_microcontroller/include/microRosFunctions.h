//
// Created by Robbie on 11/20/24.
//

#ifndef JOYSTICK_MICROROSFUNCTIONS_H
#define JOYSTICK_MICROROSFUNCTIONS_H

#include <Arduino.h>
#include "JoystickFunctions.h"
#include "UltrasonicFunctions.h"
#include "PIRFunctions.h"
#include "FanFunctions.h"
#include "IMUFunctions.h"

#ifdef ROS
/**
 * Sets up microROS communication
 * @param timerValue The transmission period
 * @param nodeName The name of the node
 * @param sensorTopicName The name of the topic
 * @param fingerprintTopicName
 */
boolean microRosSetup(unsigned int timerValue, const char *nodeName, const char *sensorTopicName, const char *fingerprintTopicName);

bool create_entities();

void destroy_entities();

void microRosTick();

void transmitMsg(RefDisplacement thetaRef, RefSpeed omegaRef, USData ultrasonicData, PIRSensors pirSensors, FanSpeeds fanSpeeds, IMUData imuData);

void publishFingerprint(uint8_t fingerprintID);

void publishError(bool joystick_adc_error, bool ultrasonic_adc_error, bool fingerprint_error, bool imu_error);

static void fan_subscription_callback(const void *msgin);

static void light_subscription_callback(const void *msgin);

static void lidar_subscription_callback(const void *msgin);

#elif ROS_DEBUG
/**
 * Sets up microROS communication
 * @param timerValue The transmission period
 * @param nodeName The name of the node
 * @param topicName The name of the topic
 */
boolean microRosSetup(unsigned int timerValue, const char *nodeName, const char *topicName);

/**
 * Transmits the message over ROS
 * @param omegaRef The referenceSpeed struct to transmit
 */
void transmitMsg(RefSpeed omegaRef);
#endif

void checkConnection();

void reconnectAgent();

#endif // JOYSTICK_MICROROSFUNCTIONS_H
