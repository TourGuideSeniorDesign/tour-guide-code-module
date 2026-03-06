export type {
  AutogiroInterfacesFanSpeed,
  AutogiroInterfacesRefSpeed,
  AutogiroInterfacesSensors,
  AutogiroInterfacesStatus,
} from "./ros-msgs.gen";

export type RosConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";
