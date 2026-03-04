/* eslint-disable */
// These files were generated using "ros-typescript-generator"
export interface AutogiroInterfacesBattery {
  battery_percent: number;
}

export interface AutogiroInterfacesBrake {
  brake: boolean;
}

export interface AutogiroInterfacesDacValues {
  left_dac: number;
  right_dac: number;
}

export interface AutogiroInterfacesFanSpeed {
  fan_percent_0: number;
  fan_percent_1: number;
  fan_percent_2: number;
  fan_percent_3: number;
}

export interface AutogiroInterfacesFingerprint {
  user_id: number;
}

export interface AutogiroInterfacesLidar {
  state: AutogiroInterfacesLidarState;
}

export enum AutogiroInterfacesLidarState {
  OFF = 0,
  ON = 1,
}

export interface AutogiroInterfacesLight {
  state: AutogiroInterfacesLightState;
}

export enum AutogiroInterfacesLightState {
  OFF = 0,
  STEADY = 1,
  FLASH = 2,
}

export interface AutogiroInterfacesMotors {
  right_mph: number;
  left_mph: number;
}

export interface AutogiroInterfacesRefSpeed {
  left_speed: number;
  right_speed: number;
  lat_disp: number;
  long_disp: number;
}

export interface AutogiroInterfacesSensorError {
  joystick_adc_error: boolean;
  ultrasonic_adc_error: boolean;
  fingerprint_error: boolean;
  imu_error: boolean;
}

export interface AutogiroInterfacesSensors {
  lat_disp: number;
  long_disp: number;
  left_speed: number;
  right_speed: number;
  ultrasonic_front_0: number;
  ultrasonic_front_1: number;
  ultrasonic_back: number;
  ultrasonic_left: number;
  ultrasonic_right: number;
  pir_front: boolean;
  pir_back: boolean;
  pir_left: boolean;
  pir_right: boolean;
  fan_speed_0: number;
  fan_speed_1: number;
  fan_speed_2: number;
  fan_speed_3: number;
  linear_acceleration_x: number;
  linear_acceleration_y: number;
  linear_acceleration_z: number;
  angular_velocity_x: number;
  angular_velocity_y: number;
  angular_velocity_z: number;
  magnetic_field_x: number;
  magnetic_field_y: number;
  magnetic_field_z: number;
}

export interface AutogiroInterfacesStatus {
  name: string;
  message: string;
  count: number;
}