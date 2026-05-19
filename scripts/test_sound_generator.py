#!/usr/bin/env python3
"""Standalone preview of the sound_generator node's audio output.

Simulates a /motor_speed signal (ramp up, hold, ramp down, stop) and renders
the same two-voice tone the node would produce, so you can audition the sound
without bringing up ROS.
"""
import threading
import time

import numpy as np
import sounddevice as sd


SAMPLE_RATE = 44100
BLOCK_SIZE = 512

MOVING_THRESHOLD_MPH = 0.05
MAX_MPH_FOR_MAPPING = 3.0

BASE_FREQ_MIN_HZ = 196.0
BASE_FREQ_MAX_HZ = 330.0
HARMONY_RATIO = 1.5

BASE_AMP = 0.025
AMP_RANGE = 0.035

AMP_TAU_S = 0.08
FREQ_TAU_S = 0.15


class ToneEngine:
    def __init__(self):
        self.lock = threading.Lock()
        self.target_amp = 0.0
        self.target_freq = BASE_FREQ_MIN_HZ
        self.smoothed_amp = 0.0
        self.smoothed_freq = BASE_FREQ_MIN_HZ
        self.phase_base = 0.0
        self.phase_harmony = 0.0

    def set_speed_mph(self, speed_mph: float):
        if speed_mph < MOVING_THRESHOLD_MPH:
            target_amp = 0.0
            target_freq = BASE_FREQ_MIN_HZ
        else:
            t = min(speed_mph / MAX_MPH_FOR_MAPPING, 1.0)
            target_amp = BASE_AMP + t * AMP_RANGE
            target_freq = BASE_FREQ_MIN_HZ + t * (BASE_FREQ_MAX_HZ - BASE_FREQ_MIN_HZ)

        with self.lock:
            self.target_amp = target_amp
            self.target_freq = target_freq

    def callback(self, outdata, frames, time_info, status):
        if status:
            pass

        with self.lock:
            target_amp = self.target_amp
            target_freq = self.target_freq

        block_dt = frames / SAMPLE_RATE
        amp_alpha = 1.0 - np.exp(-block_dt / AMP_TAU_S)
        freq_alpha = 1.0 - np.exp(-block_dt / FREQ_TAU_S)

        amp_start = self.smoothed_amp
        freq_start = self.smoothed_freq
        amp_end = amp_start + (target_amp - amp_start) * amp_alpha
        freq_end = freq_start + (target_freq - freq_start) * freq_alpha

        amp_ramp = np.linspace(amp_start, amp_end, frames, dtype=np.float32)
        freq_ramp = np.linspace(freq_start, freq_end, frames, dtype=np.float32)

        dphase_base = 2.0 * np.pi * freq_ramp / SAMPLE_RATE
        dphase_harmony = dphase_base * HARMONY_RATIO

        phases_base = self.phase_base + np.cumsum(dphase_base)
        phases_harmony = self.phase_harmony + np.cumsum(dphase_harmony)

        signal = amp_ramp * (np.sin(phases_base) + 0.5 * np.sin(phases_harmony))
        outdata[:, 0] = signal

        self.phase_base = float(phases_base[-1] % (2.0 * np.pi))
        self.phase_harmony = float(phases_harmony[-1] % (2.0 * np.pi))
        self.smoothed_amp = float(amp_end)
        self.smoothed_freq = float(freq_end)


def run_segment(label: str, duration_s: float, speed_fn):
    """Drive the engine for duration_s seconds, calling speed_fn(t)->mph at 20 Hz."""
    print(f"[{label}]")
    start = time.monotonic()
    next_tick = start
    while True:
        now = time.monotonic()
        elapsed = now - start
        if elapsed >= duration_s:
            break
        speed = speed_fn(elapsed)
        engine.set_speed_mph(speed)
        next_tick += 0.05
        sleep_for = next_tick - time.monotonic()
        if sleep_for > 0:
            time.sleep(sleep_for)


if __name__ == '__main__':
    engine = ToneEngine()
    stream = sd.OutputStream(
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype='float32',
        blocksize=BLOCK_SIZE,
        callback=engine.callback,
    )
    stream.start()

    try:
        run_segment("idle (silent)", 1.0, lambda t: 0.0)
        run_segment("ramp 0 -> 3 mph", 3.0, lambda t: (t / 3.0) * 3.0)
        run_segment("hold at 3 mph", 2.0, lambda t: 3.0)
        run_segment("hold at 1 mph", 2.0, lambda t: 1.0)
        run_segment("ramp 1 -> 0 mph", 2.0, lambda t: max(0.0, 1.0 - t / 2.0))
        run_segment("idle (silent)", 1.0, lambda t: 0.0)
    finally:
        stream.stop()
        stream.close()
    print("Done.")
