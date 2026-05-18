#!/usr/bin/env python3
import numpy as np
import sounddevice as sd

SAMPLE_RATE = 44100
DURATION = 5.0
CHANNELS = 1

print(f"Recording for {DURATION}s...")
recording = sd.rec(int(DURATION * SAMPLE_RATE),
                   samplerate=SAMPLE_RATE,
                   channels=CHANNELS,
                   dtype=np.float32)
sd.wait()
print("Recording finished.")

samples = recording.flatten()
avg_abs = float(np.mean(np.abs(samples)))
rms = float(np.sqrt(np.mean(samples ** 2)))
peak = float(np.max(np.abs(samples)))
db_rms = 20 * np.log10(rms) if rms > 0 else float("-inf")

print(f"Average |amplitude|: {avg_abs:.5f}")
print(f"RMS:                 {rms:.5f}  ({db_rms:.2f} dBFS)")
print(f"Peak:                {peak:.5f}")

print("Playing back...")
sd.play(recording, SAMPLE_RATE)
sd.wait()
print("Done.")
