import threading

import numpy as np
import rclpy
import sounddevice as sd
from rclpy.node import Node

from autogiro.qos_profiles import MONITORING
from autogiro_interfaces.msg import Motors
from autogiro_utils import remote_logger


SAMPLE_RATE = 44100
BLOCK_SIZE = 512

MOVING_THRESHOLD_MPH = 0.05
MAX_MPH_FOR_MAPPING = 3.0

BASE_FREQ_MIN_HZ = 196.0   # G3
BASE_FREQ_MAX_HZ = 330.0   # E4
HARMONY_RATIO = 1.5        # perfect fifth above the base — pleasant, not dissonant

# Keep it quiet. Final per-voice amplitude is BASE_AMP + speed_factor * AMP_RANGE,
# summed across two voices, clipped well below 1.0.
BASE_AMP = 0.025
AMP_RANGE = 0.035

# Smoothing time constants (seconds) for the audio-thread parameter low-pass.
# Slower than block period so we don't get clicks or audible steps.
AMP_TAU_S = 0.08
FREQ_TAU_S = 0.15

STALE_TIMEOUT_S = 0.5


class SoundGenerator(Node):
    def __init__(self):
        super().__init__('sound_generator')

        self.create_subscription(Motors, '/motor_speed', self._on_motors, MONITORING)

        self._lock = threading.Lock()
        self._target_amp = 0.0
        self._target_freq = BASE_FREQ_MIN_HZ
        self._smoothed_amp = 0.0
        self._smoothed_freq = BASE_FREQ_MIN_HZ
        self._phase_base = 0.0
        self._phase_harmony = 0.0

        self._last_msg_time = self.get_clock().now()
        self._stale_timer = self.create_timer(0.2, self._check_stale)

        try:
            self._stream = sd.OutputStream(
                samplerate=SAMPLE_RATE,
                channels=1,
                dtype='float32',
                blocksize=BLOCK_SIZE,
                callback=self._audio_callback,
            )
            self._stream.start()
        except Exception as e:
            self.get_logger().error(f'Failed to open audio output: {e}')
            remote_logger.log('sound_generator', 'error', f'Failed to open audio output: {e}')
            raise

        self.get_logger().info('Sound generator started')
        remote_logger.log('sound_generator', 'info', 'Sound generator started')

    def _on_motors(self, msg: Motors):
        speed = max(abs(float(msg.left_mph)), abs(float(msg.right_mph)))
        self._last_msg_time = self.get_clock().now()

        if speed < MOVING_THRESHOLD_MPH:
            target_amp = 0.0
            target_freq = BASE_FREQ_MIN_HZ
        else:
            t = min(speed / MAX_MPH_FOR_MAPPING, 1.0)
            target_amp = BASE_AMP + t * AMP_RANGE
            target_freq = BASE_FREQ_MIN_HZ + t * (BASE_FREQ_MAX_HZ - BASE_FREQ_MIN_HZ)

        with self._lock:
            self._target_amp = target_amp
            self._target_freq = target_freq

    def _check_stale(self):
        elapsed = (self.get_clock().now() - self._last_msg_time).nanoseconds * 1e-9
        if elapsed > STALE_TIMEOUT_S:
            with self._lock:
                self._target_amp = 0.0

    def _audio_callback(self, outdata, frames, time_info, status):
        if status:
            # underruns etc — just keep going, ROS logging from audio thread isn't safe
            pass

        with self._lock:
            target_amp = self._target_amp
            target_freq = self._target_freq

        block_dt = frames / SAMPLE_RATE
        amp_alpha = 1.0 - np.exp(-block_dt / AMP_TAU_S)
        freq_alpha = 1.0 - np.exp(-block_dt / FREQ_TAU_S)

        amp_start = self._smoothed_amp
        freq_start = self._smoothed_freq
        amp_end = amp_start + (target_amp - amp_start) * amp_alpha
        freq_end = freq_start + (target_freq - freq_start) * freq_alpha

        amp_ramp = np.linspace(amp_start, amp_end, frames, dtype=np.float32)
        freq_ramp = np.linspace(freq_start, freq_end, frames, dtype=np.float32)

        dphase_base = 2.0 * np.pi * freq_ramp / SAMPLE_RATE
        dphase_harmony = dphase_base * HARMONY_RATIO

        phases_base = self._phase_base + np.cumsum(dphase_base)
        phases_harmony = self._phase_harmony + np.cumsum(dphase_harmony)

        # Harmony voice is quieter so the fundamental dominates.
        signal = amp_ramp * (np.sin(phases_base) + 0.5 * np.sin(phases_harmony))

        outdata[:, 0] = signal

        self._phase_base = float(phases_base[-1] % (2.0 * np.pi))
        self._phase_harmony = float(phases_harmony[-1] % (2.0 * np.pi))
        self._smoothed_amp = float(amp_end)
        self._smoothed_freq = float(freq_end)

    def shutdown(self):
        try:
            self._stream.stop()
            self._stream.close()
        except Exception:
            pass


def main(args=None):
    rclpy.init(args=args)
    node = SoundGenerator()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.shutdown()
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
