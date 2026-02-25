/* Eren Tekbas for ECE Senior Design 2025
MicroController Handling Reference Speed
This code is for the microcontroller to retrieve the target speed from the onboard
computer and send it to the motor controller after adjusting it.
It will also read the speed of the motor and send it to the onboard computer.
*/

#include <Arduino.h>
#include <Adafruit_MCP4725.h>
#include "RefSpeed.h"
#include "BatteryFunctions.h"
#include "globals.h"

#if defined(ROS) || defined(ROS_DEBUG)
#include <micro_ros_platformio.h>
#include "microRosFunctions.h"

#endif

Adafruit_MCP4725 dacA;
Adafruit_MCP4725 dacB;
// For Adafruit MCP4725A1 the address is 0x62 (default) or 0x63 (ADDR pin tied to VCC)

int dacClockPin = 5; // GPIO number for these variables
int brakePin = 10;
int directionLPin = 12;
int directionRPin = 13;
int enablePin = 11;
int speedPin = 4;
int motorSpeedPin = 22;
int batteryPin = 28;
int speedFreqRPin = 15;
int speedFreqLPin = 14;

// 4095 is max
float motorMaxSpeed = 1000;

// variables to be used in the code
bool brake;        // brake for motor controller
bool directionL;   // direction for motor controller LEFT
bool directionR;   // direction for motor controller RIGHT
bool enable;       // enable for motor controller
int motorSpeed;    // value read from the motor speed sensor
int16_t refSpeedR; // value sent to the motor controller for speed of right motor
int16_t refSpeedL; // value sent to the motor controller for speed of left motor
int16_t batteryValue;
refSpeed refSpeedSensors;

// //variables to handle frequecy reading and tranfer to speed
volatile uint32_t pulse_count_1 = 0;
volatile uint32_t pulse_count_2 = 0;

void pulse_handler_1() { pulse_count_1++; }
void pulse_handler_2() { pulse_count_2++; }

float freqR;
float freqL;
float speedR;
float speedL;
unsigned long freqSampleStart = 0;
const unsigned long freqSampleDuration = 1000; // in ms

bool measuringFreq = false;

void setup()
{
    Serial.begin(115200); // start I2C communication protocol

    while (!Serial)
    {
        delay(10); // wait for serial
    }

    delay(2000);

#if defined(ROS) || defined(ROS_DEBUG)
    set_microros_serial_transports(Serial);
    delay(2000);
#endif

    // initiate ADC for battery level reading testing
    initBatterySensor(); // BATTERY: initialize ADC hardware

    // initiate the DACs
    while (!dacA.begin(0x62))
    {
        Serial.println("DAC A not found");
        delay(500);
    }
    while (!dacB.begin(0x63))
    {
        Serial.println("DAC B not found");
        delay(500);
    }
    // pinMode(dacClockPin,OUTPUT); // set the pins to be used as output
    // pinMode(speedPin,OUTPUT);
    pinMode(batteryPin, INPUT);
    pinMode(directionLPin, OUTPUT);
    pinMode(directionRPin, OUTPUT);
    pinMode(brakePin, OUTPUT);
    // pinMode(refSpeedPin,INPUT); // set the pins to be used as input
    pinMode(motorSpeedPin, INPUT);

    brake = false;
    enable = true;

    pinMode(speedFreqRPin, INPUT_PULLDOWN);
    pinMode(speedFreqLPin, INPUT_PULLDOWN);
    attachInterrupt(digitalPinToInterrupt(speedFreqRPin), pulse_handler_1, RISING);
    attachInterrupt(digitalPinToInterrupt(speedFreqLPin), pulse_handler_2, RISING);
}

void getFreq()
{
    if (!measuringFreq)
    {
        // Start measuring
        pulse_count_1 = 0;
        pulse_count_2 = 0;
        freqSampleStart = millis();
        measuringFreq = true;
    }

    if (millis() - freqSampleStart >= freqSampleDuration)
    {
        // Finish measuring
        freqR = (pulse_count_1 * 1000.0) / freqSampleDuration;
        freqL = (pulse_count_2 * 1000.0) / freqSampleDuration;
        measuringFreq = false;
    }
}

// conversion of frequency to MPH
void freqToSpeed()
{
    speedR = (freqR * 10 / 21.33) * 3.14 * 12.5 * 60 / 63360;
    speedL = (freqL * 10 / 21.33) * 3.14 * 12.5 * 60 / 63360;
}

void loop()
{

#if defined(ROS) || defined(ROS_DEBUG)
    microRosTick();
    refSpeedSensors = getRefSpeed();

#endif

    // enable = true; // enable the motor controller
    /*joystickSpeed{} = digitalRead(refSpeedPin); // read the reference speed from the onboard computer
    speedR = joystickSpeed.speedR;
    speedL = joystickSpeed.speedL;
    */
    // this part will be discussed with the sensors team
    /*
    directionR = true; // initially forward direction
    directionL = true; // initially forward direction
    brake = false; // initially no brake
    if(speedR == 0 && speedL == 0){ // if the reference speed is 0, stop the motor
      brake = true; // activate the brake if joystick outputs 0 in both directions
    }

    else{
      brake = false; // deactivate the brake if joystick outputs a value other than 0
      if(speedR<0){
        directionR = false; // set the direction to right if the joystick outputs a negative value
        refSpeedR = speedR*-1; // set the reference speed to the absolute value of the joystick output
      }
      else if(speedL<0){
        directionL = false; // set the direction to left if the joystick outputs a positive value
        refSpeedL = speedL*-1; // set the reference speed to the absolute value of the joystick output
      }
      else{
        refSpeedR = speedR; // set the referrence speed to the joystick output
        refSpeedL = speedL;
      }

      //refSpeedR = refSpeedR*4095/100; // adjust the reference speed Right to the motor controller
      //refSpeedL = refSpeedL*4095/100; // adjust the reference speed Left to the motor controller

    }
    */

    enable = false; // enable the motor controller
    if (refSpeedSensors.rightSpeed == 0 && refSpeedSensors.leftSpeed == 0)
    {
        // brake = false; //brake if speeds are 0
        enable = true;
    }
    else
    {
        brake = true; // disable brake if speeds are not 0
    }
    // add break if emergency button is pushed

    if (refSpeedSensors.rightSpeed > 0)
    {
        directionR = false;
    }
    else
    {
        directionR = true;
    }

    if (refSpeedSensors.leftSpeed > 0)
    {
        directionL = false;
    }
    else
    {
        directionL = true;
    }

    float tempRefSpeedR = abs(refSpeedSensors.rightSpeed) * motorMaxSpeed / 100;
    float tempRefSpeedL = abs(refSpeedSensors.leftSpeed) * motorMaxSpeed / 100;

    refSpeedR = static_cast<int16_t>(tempRefSpeedR);
    refSpeedL = static_cast<int16_t>(tempRefSpeedL);

#if defined(ROS) || defined(ROS_DEBUG)
    // Adding the ebrake. The brake variable is flipped, so false = brake on
    if (eBrake)
    {
        brake = false;
    }
    transmitDac(refSpeedL, refSpeedR);
#endif

    digitalWrite(directionLPin, directionL);
    digitalWrite(directionRPin, directionR);
    digitalWrite(enablePin, enable);
    digitalWrite(brakePin, brake);
    dacB.setVoltage(refSpeedR, false);
    dacA.setVoltage(refSpeedL, false);
    getFreq();
    freqToSpeed();

#ifdef ROS_DEBUG
    transmitDac(refSpeedL, refSpeedR);
#endif
}
