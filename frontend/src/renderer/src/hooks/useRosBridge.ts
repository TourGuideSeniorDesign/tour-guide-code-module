import { useEffect, useState } from "react";
import type {
  PublishResult,
  RosBridgeSnapshot,
  TourControlMessage,
} from "../../../shared/rosBridge";

interface RosBridgeAPI {
  connect: (url: string) => Promise<void>;
  disconnect: () => Promise<void>;
  getState: () => Promise<RosBridgeSnapshot>;
  publishTourControl: (message: TourControlMessage) => Promise<PublishResult>;
  onState: (listener: (snapshot: RosBridgeSnapshot) => void) => () => void;
}

const emptySnapshot: RosBridgeSnapshot = {
  url: "ws://localhost:9090",
  connectionState: "disconnected",
  retryCountdown: null,
  topics: {
    status: null,
    fanSpeed: null,
    sensors: null,
    refSpeed: null,
    tourControl: null,
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
  };
}
