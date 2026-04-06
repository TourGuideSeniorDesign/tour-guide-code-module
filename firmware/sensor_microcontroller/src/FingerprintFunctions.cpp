//
// Functions created by Nam
// Modified by Robbie
//

#include "FingerprintFunctions.h"
#include <Arduino.h>
#include <Adafruit_Fingerprint.h>
#include "debug.h"

#if (defined(__AVR__) || defined(ESP8266)) && !defined(__AVR_ATmega2560__)
// pin #2 is IN from sensor (GREEN wire)
// pin #3 is OUT from arduino  (WHITE wire)
// Set up the serial port to use softwareserial..
SoftwareSerial fingerprintSerial(0, 1);

#else
// On Leonardo/M0/etc, others with hardware serial, use hardware serial!
// #0 is green wire, #1 is white
#define fingerprintSerial Serial1

#endif

Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fingerprintSerial);

uint8_t getFingerprintID() {
  uint8_t p = finger.getImage();
  switch (p) {
    case FINGERPRINT_OK:
      DEBUG_PRINTLN("Image taken");
      break;
    case FINGERPRINT_NOFINGER:
      DEBUG_PRINTLN("No finger detected");
      return p;
    case FINGERPRINT_PACKETRECIEVEERR:
      DEBUG_PRINTLN("Communication error");
      return p;
    case FINGERPRINT_IMAGEFAIL:
      DEBUG_PRINTLN("Imaging error");
      return p;
    default:
      DEBUG_PRINTLN("Unknown error");
      return p;
  }
  // OK success!
  p = finger.image2Tz();
  switch (p) {
    case FINGERPRINT_OK:
      DEBUG_PRINTLN("Image converted");
      break;
    case FINGERPRINT_IMAGEMESS:
      DEBUG_PRINTLN("Image too messy");
      return p;
    case FINGERPRINT_PACKETRECIEVEERR:
      DEBUG_PRINTLN("Communication error");
      return p;
    case FINGERPRINT_FEATUREFAIL:
      DEBUG_PRINTLN("Could not find fingerprint features");
      return p;
    case FINGERPRINT_INVALIDIMAGE:
      DEBUG_PRINTLN("Could not find fingerprint features");
      return p;
    default:
      DEBUG_PRINTLN("Unknown error");
      return p;
  }
  // OK converted!
  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    DEBUG_PRINTLN("Found a print match!");
  } else if (p == FINGERPRINT_PACKETRECIEVEERR) {
    DEBUG_PRINTLN("Communication error");
    return p;
  } else if (p == FINGERPRINT_NOTFOUND) {
    DEBUG_PRINTLN("Did not find a match");
    return p;
  } else {
    DEBUG_PRINTLN("Unknown error");
    return p;
  }

  // found a match!
  DEBUG_PRINT("Found ID #"); DEBUG_PRINT(finger.fingerID);
  DEBUG_PRINT(" with confidence of "); DEBUG_PRINTLN(finger.confidence);

  return finger.fingerID;
}

bool setupFingerprint()
{
#if !defined(ROS) && !defined(ROS_DEBUG)
  while (!Serial);  // For Yun/Leo/Micro/Zero/...
#endif
  delay(100);
  DEBUG_PRINTLN("\n\nAdafruit finger detect test");

  // set the data rate for the sensor serial port
  finger.begin(57600);
  delay(5);
  if (finger.verifyPassword()) {
    DEBUG_PRINTLN("Found fingerprint sensor!");
  } else {
    int init_count = 0;
    DEBUG_PRINTLN("Did not find fingerprint sensor :(");
    while (!finger.verifyPassword()) {
      DEBUG_PRINTLN(init_count);
      if (init_count > 10) {
        return true;
      }
      init_count++;
    }
  }

  DEBUG_PRINTLN(F("Reading sensor parameters"));
  finger.getParameters();
  DEBUG_PRINT(F("Status: 0x")); DEBUG_PRINTLN(finger.status_reg, HEX);
  DEBUG_PRINT(F("Sys ID: 0x")); DEBUG_PRINTLN(finger.system_id, HEX);
  DEBUG_PRINT(F("Capacity: ")); DEBUG_PRINTLN(finger.capacity);
  DEBUG_PRINT(F("Security level: ")); DEBUG_PRINTLN(finger.security_level);
  DEBUG_PRINT(F("Device address: ")); DEBUG_PRINTLN(finger.device_addr, HEX);
  DEBUG_PRINT(F("Packet len: ")); DEBUG_PRINTLN(finger.packet_len);
  DEBUG_PRINT(F("Baud rate: ")); DEBUG_PRINTLN(finger.baud_rate);

  finger.getTemplateCount();

  if (finger.templateCount == 0) {
    DEBUG_PRINT("Sensor doesn't contain any fingerprint data. Please run the 'enroll' example.");
  }
  else {
    DEBUG_PRINTLN("Waiting for valid finger...");
    DEBUG_PRINT("Sensor contains "); DEBUG_PRINT(finger.templateCount); DEBUG_PRINTLN(" templates");
  }
  return false;
}

void loopFingerprint()                     // run over and over again
{
  getFingerprintID();
  delay(50);            //don't ned to run this at full speed.
}
