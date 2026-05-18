#!/usr/bin/env python3
import math
import struct
import subprocess
import tempfile
import wave

SAMPLE_RATE = 44100
DURATION = 5.0
CHANNELS = 1

with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
    path = f.name

print(f"Recording for {DURATION}s...")
subprocess.run([
    "arecord", "-q",
    "-f", "S16_LE",
    "-r", str(SAMPLE_RATE),
    "-c", str(CHANNELS),
    "-d", str(int(DURATION)),
    path,
], check=True)
print("Recording finished.")

with wave.open(path, "rb") as w:
    n = w.getnframes()
    raw = w.readframes(n)

samples = struct.unpack("<" + "h" * (len(raw) // 2), raw)
n = len(samples)
abs_sum = sum(abs(s) for s in samples)
sq_sum = sum(s * s for s in samples)
peak = max(abs(s) for s in samples) if samples else 0

avg_abs = abs_sum / n / 32768
rms = math.sqrt(sq_sum / n) / 32768
peak_f = peak / 32768
db_rms = 20 * math.log10(rms) if rms > 0 else float("-inf")

print(f"Average |amplitude|: {avg_abs:.5f}")
print(f"RMS:                 {rms:.5f}  ({db_rms:.2f} dBFS)")
print(f"Peak:                {peak_f:.5f}")

print("Playing back...")
subprocess.run(["aplay", "-q", path], check=True)
print("Done.")
