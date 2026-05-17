import { useEffect, useState } from "react";
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

const emptySnapshot: RosBridgeSnapshot = {
  url: "ws://127.0.0.1:9090",
  connectionState: "disconnected",
  retryCountdown: null,
  topics: {
    status: null,
    fanSpeed: null,
    sensors: null,
    refSpeed: null,
    tourControl: null,
    battery: null,
    motorSpeed: null,
    ebrake: null,
  },
  joystickControl: {
    enabled: null,
    error: null,
  },
};

const rosBridge = (window as Window & { rosBridge: RosBridgeAPI }).rosBridge;

export interface UseRosBridgeResult extends RosBridgeSnapshot {
  connect: (url: string) => Promise<void>;
  disconnect: () => Promise<void>;
  publishTourControl: (message: TourControlMessage) => Promise<{
    ok: boolean;
    error?: string;
  }>;
  publishRefSpeed: (message: RefSpeedCommand) => Promise<{
    ok: boolean;
    error?: string;
  }>;
  publishEbrake: (message: BrakeCommand) => Promise<{
    ok: boolean;
    error?: string;
  }>;
  setJoystickEnabled: (enabled: boolean) => Promise<{
    ok: boolean;
    error?: string;
  }>;
  refreshJoystickControl: () => Promise<{
    ok: boolean;
    error?: string;
  }>;
}

export function useRosBridge(): UseRosBridgeResult {
  const [snapshot, setSnapshot] = useState<RosBridgeSnapshot>(emptySnapshot);

  useEffect(() => {
    let disposed = false;

    void rosBridge.getState().then((state: RosBridgeSnapshot) => {
      if (!disposed) {
        setSnapshot(state);
      }
    });

    const unsubscribe = rosBridge.onState((state: RosBridgeSnapshot) => {
      setSnapshot(state);
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  return {
    ...snapshot,
    connect: rosBridge.connect,
    disconnect: rosBridge.disconnect,
    publishTourControl: rosBridge.publishTourControl,
    publishRefSpeed: rosBridge.publishRefSpeed,
    publishEbrake: rosBridge.publishEbrake,
    setJoystickEnabled: rosBridge.setJoystickEnabled,
    refreshJoystickControl: rosBridge.refreshJoystickControl,
  };
}
