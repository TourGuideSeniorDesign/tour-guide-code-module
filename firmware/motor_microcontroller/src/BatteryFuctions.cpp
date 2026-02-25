#include "BatteryFunctions.h"

void initBatterySensor()
{
    adc_init();
    adc_gpio_init(ADC_PIN);
    adc_select_input(2);
}

float readBatteryVoltage()
{
    uint16_t raw_adc = adc_read();
    float adc_voltage = (raw_adc * VREF) / ADC_MAX;
    float scaled_voltage = adc_voltage / VOLTAGE_DIVIDER_RATIO;
    float battery_voltage = scaled_voltage / OPAMP_GAIN;
    return battery_voltage;
}

int8_t calculateBatteryPercentage(float battery_voltage)
{
    float percent = ((battery_voltage - BATTERY_VOLTAGE_MIN) /
                     (BATTERY_VOLTAGE_MAX - BATTERY_VOLTAGE_MIN)) *
                    100.0;

    if (percent > 100.0)
        percent = 100.0;
    if (percent < 0.0)
        percent = 0.0;

    return static_cast<int8_t>(percent);
}
