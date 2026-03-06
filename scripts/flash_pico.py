#!/usr/bin/env python3

# Pico Microcontroller Flash Helper
# Puts a selected Pico into BOOTSEL mode using 1200 baud reset trick

import os
import glob
import subprocess
import time
import sys
import signal
from dataclasses import dataclass

SENSOR_SERIAL = "256863E623864193"
MOTOR_SERIAL = "E663A837CB546B37"


@dataclass
class PicoDevice:
    path: str
    serial: str
    label: str
    known: bool = False


def signal_handler(sig, frame):
    print("\n\nOperation cancelled by user.")
    sys.exit(0)


def get_device_serial(dev):
    try:
        result = subprocess.run(
            ["udevadm", "info", dev],
            capture_output=True,
            text=True,
        )
        for line in result.stdout.splitlines():
            if "ID_SERIAL_SHORT=" in line:
                return line.split("=", 1)[1].strip()
    except Exception:
        return ""
    return ""


def find_connected_picos():
    known_map = {
        SENSOR_SERIAL: "Sensor Microcontroller",
        MOTOR_SERIAL: "Motor Microcontroller",
    }
    devices = []

    for dev in sorted(glob.glob("/dev/ttyACM*")):
        serial = get_device_serial(dev)
        label = known_map.get(serial, "Unidentified Pico")
        devices.append(
            PicoDevice(
                path=dev,
                serial=serial,
                label=label,
                known=serial in known_map,
            )
        )

    return devices


def main():
    # Register signal handler for graceful exit on Ctrl+C
    signal.signal(signal.SIGINT, signal_handler)

    print("==========================================")
    print("  Pico Microcontroller Flash Helper")
    print("==========================================")
    print()

    devices = find_connected_picos()
    sensor_device = next((d for d in devices if d.serial == SENSOR_SERIAL), None)
    motor_device = next((d for d in devices if d.serial == MOTOR_SERIAL), None)

    print("Currently connected Picos:")
    print()

    if sensor_device:
        print(
            f"  [1] Sensor Microcontroller - {sensor_device.path} "
            f"(Serial: {SENSOR_SERIAL})"
        )
    else:
        print("  [1] Sensor Microcontroller - NOT CONNECTED")

    if motor_device:
        print(
            f"  [2] Motor Microcontroller  - {motor_device.path} "
            f"(Serial: {MOTOR_SERIAL})"
        )
    else:
        print("  [2] Motor Microcontroller  - NOT CONNECTED")

    unknown_devices = [d for d in devices if not d.known]
    menu_lookup = {
        "1": sensor_device,
        "2": motor_device,
    }
    next_option = 3
    for dev in unknown_devices:
        choice = str(next_option)
        menu_lookup[choice] = dev
        print(
            f"  [{choice}] Unidentified Pico      - {dev.path} "
            f"(Serial: {dev.serial or 'unknown'})"
        )
        next_option += 1

    manual_option = str(next_option)
    exit_option = str(next_option + 1)
    print()
    print(f"  [{manual_option}] Manual - specify /dev/ttyACMx")
    print(f"  [{exit_option}] Exit")
    print()

    try:
        choice = input("Select which Pico to put into BOOTSEL mode: ").strip()
    except (EOFError, KeyboardInterrupt):
        print("\n\nOperation cancelled by user.")
        sys.exit(0)

    if choice in menu_lookup:
        target = menu_lookup[choice]
        if not target:
            if choice == "1":
                print("Error: Sensor microcontroller not connected!")
            elif choice == "2":
                print("Error: Motor microcontroller not connected!")
            else:
                print("Error: Selected device not connected!")
            sys.exit(1)
        target_dev = target.path
        if target.known:
            target_name = target.label
        else:
            target_name = f"{target.label} ({target.serial or 'unknown'})"
    elif choice == manual_option:
        try:
            target_dev = input("Enter device path (e.g., /dev/ttyACM0): ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n\nOperation cancelled by user.")
            sys.exit(0)
        if not os.path.exists(target_dev):
            print(f"Error: Device {target_dev} does not exist!")
            sys.exit(1)
        target_name = target_dev
    elif choice == exit_option:
        print("Exiting.")
        sys.exit(0)
    else:
        print("Invalid choice!")
        sys.exit(1)

    print()
    print(f"Triggering BOOTSEL mode on {target_name} ({target_dev})...")

    result = subprocess.run(["stty", "-F", target_dev, "1200"])

    if result.returncode == 0:
        print("✓ 1200 baud reset signal sent")
        print()
        print("Waiting for device to enter BOOTSEL mode...")
        try:
            time.sleep(3)
        except KeyboardInterrupt:
            print("\n\nOperation cancelled by user.")
            sys.exit(0)

        mount_points = glob.glob("/media/*/RPI-RP2")
        if mount_points:
            mount_point = mount_points[0]
            print("✓ Pico is now in BOOTSEL mode!")
            print(f"  Mounted at: {mount_point}")
            print()
            print("To flash firmware, copy a .uf2 file:")
            print(f"  cp your_firmware.uf2 {mount_point}/")
            print()
            print("Example for sensor firmware:")
            print(f"  cp ~/tour-guide-code-module/1firmware.uf2 {mount_point}/")
        else:
            print()
            print("⚠ Note: RPI-RP2 mass storage device not detected.")
            print()
            print("This can happen if the firmware doesn't support the 1200 baud reset.")
            print("In that case, you'll need to manually enter BOOTSEL mode:")
            print("  1. Unplug the USB cable")
            print("  2. Hold the BOOTSEL button on the Pico")
            print("  3. Plug in USB while holding BOOTSEL")
            print("  4. Release BOOTSEL")
            print()
            print("The Pico will mount as /media/*/RPI-RP2/")
    else:
        print(f"✗ Error sending reset signal to {target_dev}")
        sys.exit(1)


if __name__ == "__main__":
    main()
