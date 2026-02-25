//
// Created by Robbie on 2/5/25.
//

#include "PWMFunctions.h"
#include "hardware/pwm.h"
#include "hardware/gpio.h"

void setPWM(uint pin, float frequency, float duty_cycle) {
    uint slice = pwm_gpio_to_slice_num(pin);
    uint channel = pwm_gpio_to_channel(pin);

    gpio_set_function(pin, GPIO_FUNC_PWM);

    float clock_freq = 125000000.0; // Default RP2040 system clock (125 MHz)
    uint16_t wrap = clock_freq / frequency - 1;
    pwm_set_wrap(slice, wrap);

    uint16_t level = (wrap * duty_cycle) / 100.0;
    pwm_set_chan_level(slice, channel, level);

    pwm_set_enabled(slice, true);
}