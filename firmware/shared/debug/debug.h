#pragma once
#include <Arduino.h>

#if !defined(ROS) && !defined(ROS_DEBUG)
  #define DEBUG_PRINT(...)   Serial.print(__VA_ARGS__)
  #define DEBUG_PRINTLN(...) Serial.println(__VA_ARGS__)
#else
  #define DEBUG_PRINT(...)   ((void)0)
  #define DEBUG_PRINTLN(...)  ((void)0)
#endif
