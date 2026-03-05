#!/usr/bin/env python3

# Pico Microcontroller Flash Helper
# Puts a selected Pico into BOOTSEL mode using 1200 baud reset trick

import os
import glob
import subprocess
import time
import sys
import signal

SENSOR_SERIAL = "256863E623864193"
MOTOR_SERIAL = "E663A837CB546B37"


def signal_handler(sig, frame):
    print("\n\nOperation cancelled by user.")
    sys.exit(0)


def find_device_by_serial(serial):
    for dev in glob.glob("/dev/ttyACM*"):
        try:
            result = subprocess.run(
                ["udevadm", "info", dev],
                capture_output=True,
                text=True,
            )
            for line in result.stdout.splitlines():
                if "ID_SERIAL_SHORT=" in line:
                    dev_serial = line.split("=", 1)[1].strip()
                    if dev_serial == serial:
                        return dev
        except Exception:
            continue
    return None


def main():
    # Register signal handler for graceful exit on Ctrl+C
    signal.signal(signal.SIGINT, signal_handler)

    print("==========================================")
    print("  Pico Microcontroller Flash Helper")
    print("==========================================")
    print()

    sensor_dev = find_device_by_serial(SENSOR_SERIAL)
    motor_dev = find_device_by_serial(MOTOR_SERIAL)

    print("Currently connected Picos:")
    print()

    if sensor_dev:
        print(f"  [1] Sensor Microcontroller - {sensor_dev} (Serial: {SENSOR_SERIAL})")
    else:
        print("  [1] Sensor Microcontroller - NOT CONNECTED")

    if motor_dev:
        print(f"  [2] Motor Microcontroller  - {motor_dev} (Serial: {MOTOR_SERIAL})")
    else:
        print("  [2] Motor Microcontroller  - NOT CONNECTED")

    print()
    print("  [3] Manual - specify /dev/ttyACMx")
    print("  [4] Exit")
    print()

    try:
        choice = input("Select which Pico to put into BOOTSEL mode: ").strip()
    except (EOFError, KeyboardInterrupt):
        print("\n\nOperation cancelled by user.")
        sys.exit(0)

    if choice == "1":
        if not sensor_dev:
            print("Error: Sensor microcontroller not connected!")
            sys.exit(1)
        target_dev = sensor_dev
        target_name = "Sensor Microcontroller"
    elif choice == "2":
        if not motor_dev:
            print("Error: Motor microcontroller not connected!")
            sys.exit(1)
        target_dev = motor_dev
        target_name = "Motor Microcontroller"
    elif choice == "3":
        try:
            target_dev = input("Enter device path (e.g., /dev/ttyACM0): ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n\nOperation cancelled by user.")
            sys.exit(0)
        if not os.path.exists(target_dev):
            print(f"Error: Device {target_dev} does not exist!")
            sys.exit(1)
        target_name = target_dev
    elif choice == "4":
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
