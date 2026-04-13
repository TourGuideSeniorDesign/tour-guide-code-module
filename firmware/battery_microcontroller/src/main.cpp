#include <Arduino.h>
#include "BatteryMonitor.h"
#include "debug.h"

#if defined(ROS) || defined(ROS_DEBUG)
#include <micro_ros_platformio.h>
#include "microRosFunctions.h"
#endif

void setup() {
    Serial.begin(115200);
    while (!Serial) {
        delay(10);
    }

    delay(2000);

#if defined(ROS) || defined(ROS_DEBUG)
    set_microros_serial_transports(Serial);
    delay(2000);
#endif

    initBatteryMonitor();
}

void loop() {
#if defined(ROS) || defined(ROS_DEBUG)
    microRosTick();
#endif

    updateBatteryReadings();

    // Non-ROS debug output
#if !defined(ROS) && !defined(ROS_DEBUG)
    static unsigned long lastPrint = 0;
    if (millis() - lastPrint >= 1000) {
        DEBUG_PRINT("{\"v\":");
        DEBUG_PRINT(getVoltage());
        DEBUG_PRINT(", \"a\":");
        DEBUG_PRINT(getCurrentAmps());
        DEBUG_PRINT(", \"consumedAh\":");
        DEBUG_PRINT(getConsumedAh());
        DEBUG_PRINT(", \"battery_percent\":");
        DEBUG_PRINT(getBatteryPercent());
        DEBUG_PRINTLN("}");
        lastPrint = millis();
    }
#endif

    delay(100);
}
