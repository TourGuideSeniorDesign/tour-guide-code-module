#!/usr/bin/env python3
import math
import random
import struct
import subprocess
import tempfile
import wave

SAMPLE_RATE = 44100
DURATION = 2.0
AMPLITUDE = 0.3

freq = random.choice([261.63, 329.63, 392.00, 440.00, 523.25, 659.25, 783.99])
n_samples = int(SAMPLE_RATE * DURATION)
peak = int(AMPLITUDE * 32767)

with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
    path = f.name

with wave.open(path, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SAMPLE_RATE)
    frames = bytearray()
    for i in range(n_samples):
        v = int(peak * math.sin(2 * math.pi * freq * i / SAMPLE_RATE))
        frames += struct.pack("<h", v)
    w.writeframes(bytes(frames))

print(f"Playing {freq:.2f} Hz tone for {DURATION}s...")
subprocess.run(["aplay", "-q", path], check=True)
print("Done.")
