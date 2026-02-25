import os
import glob

import rclpy
from rclpy.node import Node
from autogiro_interfaces.msg import FanSpeed
from autogiro_utils import remote_logger
from autogiro.qos_profiles import MONITORING

# --------------------------
# CONFIGURATION
# --------------------------
# Set which fan profile to use: "LEGACY" or "CURVE"
FAN_PROFILE = "CURVE"  # Options: "LEGACY", "CURVE"
# --------------------------


def _find_thermal_zone():
    """Find the sysfs thermal zone path for the CPU (x86, ARM, RPi, etc.)."""
    base = '/sys/class/thermal/'
    for zone_dir in sorted(glob.glob(os.path.join(base, 'thermal_zone*'))):
        type_file = os.path.join(zone_dir, 'type')
        try:
            with open(type_file) as f:
                zone_type = f.read().strip()
            zone_lower = zone_type.lower()
            if 'cpu' in zone_lower or 'x86_pkg_temp' in zone_lower:
                return os.path.join(zone_dir, 'temp')
        except OSError:
            continue
    return None


def _find_hwmon_apple_smc():
    """Find a CPU/relevant temperature from Apple SMC hwmon (Asahi Linux, M1/M2)."""
    base = '/sys/class/hwmon'
    for hwmon_dir in sorted(glob.glob(os.path.join(base, 'hwmon*'))):
        name_file = os.path.join(hwmon_dir, 'name')
        try:
            with open(name_file) as f:
                name = f.read().strip().lower()
            if 'apple' not in name and 'smc' not in name and 'mac' not in name:
                continue
        except OSError:
            continue
        # Use first temp*_input (often package/CPU temp on Apple Silicon)
        for temp_path in sorted(glob.glob(os.path.join(hwmon_dir, 'temp*_input'))):
            return temp_path
    return None


def find_cpu_thermal_zone():
    """Find the sysfs path for CPU temperature (thermal zone or Apple SMC hwmon)."""
    path = _find_thermal_zone()
    if path is not None:
        return path
    return _find_hwmon_apple_smc()


def read_temperature(temp_path):
    """Read temperature in Celsius from a sysfs thermal zone temp file."""
    try:
        with open(temp_path) as f:
            return int(f.read().strip()) / 1000.0
    except (OSError, ValueError):
        return None


def legacy_fan_speed_for_temp(temp_c):
    """Return a legacy (formerly 'uniform') fan percentage based on CPU temperature."""
    if temp_c < 30.0:
        return 0
    elif temp_c < 40.0:
        return 25
    elif temp_c < 50.0:
        return 50
    else:
        return 75

def curve_fan_speed_for_temp(temp_c):
    """
    Computes a fan speed percentage based on specified ramps:
    - Below 30°C: 0%
    - 30°C to 40°C: Ramp from 0% to 25%
    - 40°C to 50°C: Ramp from 25% to 50%
    - 50°C to 80°C: Ramp from 50% to 75%
    - Above 80°C: 100%
    """
    if temp_c < 30.0:
        return 0
    elif temp_c < 40.0:
        # 0% to 25% between 30°C and 40°C
        return int((temp_c - 30.0) / 10.0 * 25)
    elif temp_c < 50.0:
        # 25% to 50% between 40°C and 50°C
        return int(25 + (temp_c - 40.0) / 10.0 * 25)
    elif temp_c < 80.0:
        # 50% to 75% between 50°C and 80°C
        return int(50 + (temp_c - 50.0) / 30.0 * 25)
    else:
        return 100

def compute_fan_speed(temp_c):
    """
    Compute the fan speed based on the selected fan profile.
    """
    if FAN_PROFILE == "LEGACY":
        return legacy_fan_speed_for_temp(temp_c)
    elif FAN_PROFILE == "CURVE":
        return curve_fan_speed_for_temp(temp_c)
    else:
        raise ValueError(f"Unknown FAN_PROFILE: {FAN_PROFILE}")


class TempMonitor(Node):
    def __init__(self):
        super().__init__('temp_monitor')
        self.publisher_ = self.create_publisher(FanSpeed, '/fan_speed', MONITORING)
        self.temp_path = find_cpu_thermal_zone()
        if self.temp_path is None:
            self.get_logger().error('CPU thermal zone not found')
            remote_logger.log("temp_monitor", "error", 'CPU thermal zone not found')
            raise RuntimeError('CPU thermal zone not found')
        self.get_logger().info(f'Using temperature source: {self.temp_path}')
        remote_logger.log("temp_monitor", "info", f'Using temperature source: {self.temp_path}')
        self.get_logger().info(f'Fan profile: {FAN_PROFILE}')
        remote_logger.log("temp_monitor", "info", f'Fan profile: {FAN_PROFILE}')
        self.timer = self.create_timer(1.0, self.timer_callback)

    def timer_callback(self):
        temp_c = read_temperature(self.temp_path)
        if temp_c is None:
            self.get_logger().warn('Failed to read temperature')
            remote_logger.log("temp_monitor", "warn", "Failed to read temperature")
            return

        self.get_logger().info(f'CPU Temperature: {temp_c:.1f} °C')
        pct = compute_fan_speed(temp_c)
        msg = FanSpeed()
        msg.fan_percent_0 = pct
        msg.fan_percent_1 = pct
        msg.fan_percent_2 = pct
        msg.fan_percent_3 = pct
        self.publisher_.publish(msg)

    def shutdown_fans(self):
        """Publish zero fan speed before shutting down."""
        msg = FanSpeed()
        msg.fan_percent_0 = 0
        msg.fan_percent_1 = 0
        msg.fan_percent_2 = 0
        msg.fan_percent_3 = 0
        self.publisher_.publish(msg)
        self.get_logger().info('Shutdown: Turning off fans')


def main(args=None):
    rclpy.init(args=args)
    node = TempMonitor()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.shutdown_fans()
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
