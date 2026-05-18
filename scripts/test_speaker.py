#!/usr/bin/env python3
import random
import numpy as np
import sounddevice as sd

SAMPLE_RATE = 44100
DURATION = 2.0

freq = random.choice([261.63, 329.63, 392.00, 440.00, 523.25, 659.25, 783.99])
t = np.linspace(0, DURATION, int(SAMPLE_RATE * DURATION), endpoint=False)
audio = 0.3 * np.sin(2 * np.pi * freq * t).astype(np.float32)

print(f"Playing {freq:.2f} Hz tone for {DURATION}s...")
sd.play(audio, SAMPLE_RATE)
sd.wait()
print("Done.")
