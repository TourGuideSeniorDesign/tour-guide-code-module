import type {
  BrakeCommand,
  PublishResult,
  RefSpeedCommand,
  RosBridgeSnapshot,
  TourControlMessage,
} from "../../../shared/rosBridge";

interface RosBridgeAPI {
  connect: (url: string) => Promise<void>;
  disconnect: () => Promise<void>;
  getState: () => Promise<RosBridgeSnapshot>;
  publishTourControl: (message: TourControlMessage) => Promise<PublishResult>;
  publishRefSpeed: (message: RefSpeedCommand) => Promise<PublishResult>;
  publishEbrake: (message: BrakeCommand) => Promise<PublishResult>;
  setJoystickEnabled: (enabled: boolean) => Promise<PublishResult>;
  refreshJoystickControl: () => Promise<PublishResult>;
  onState: (listener: (snapshot: RosBridgeSnapshot) => void) => () => void;
}

declare global {
  interface Window {
    rosBridge: RosBridgeAPI;
  }
}
