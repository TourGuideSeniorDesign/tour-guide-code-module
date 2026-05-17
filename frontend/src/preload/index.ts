import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge, ipcRenderer } from "electron";
import {
  type BrakeCommand,
  type PublishResult,
  type RefSpeedCommand,
  ROS_STATE_CHANNEL,
  type RosBridgeSnapshot,
  type TourControlMessage,
} from "../shared/rosBridge";

const rosBridgeAPI = {
  connect: (url: string): Promise<void> =>
    ipcRenderer.invoke("ros:connect", url),
  disconnect: (): Promise<void> => ipcRenderer.invoke("ros:disconnect"),
  getState: (): Promise<RosBridgeSnapshot> =>
    ipcRenderer.invoke("ros:get-state"),
  publishTourControl: (message: TourControlMessage): Promise<PublishResult> =>
    ipcRenderer.invoke("ros:publish-tour-control", message),
  publishRefSpeed: (message: RefSpeedCommand): Promise<PublishResult> =>
    ipcRenderer.invoke("ros:publish-ref-speed", message),
  publishEbrake: (message: BrakeCommand): Promise<PublishResult> =>
    ipcRenderer.invoke("ros:publish-ebrake", message),
  setJoystickEnabled: (enabled: boolean): Promise<PublishResult> =>
    ipcRenderer.invoke("ros:set-joystick-enabled", enabled),
  refreshJoystickControl: (): Promise<PublishResult> =>
    ipcRenderer.invoke("ros:refresh-joystick"),
  onState: (listener: (snapshot: RosBridgeSnapshot) => void): (() => void) => {
    const wrapped = (
      _event: Electron.IpcRendererEvent,
      snapshot: RosBridgeSnapshot,
    ) => {
      listener(snapshot);
    };
    ipcRenderer.on(ROS_STATE_CHANNEL, wrapped);
    return () => {
      ipcRenderer.removeListener(ROS_STATE_CHANNEL, wrapped);
    };
  },
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("rosBridge", rosBridgeAPI);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-expect-error
  window.electron = electronAPI;
  // @ts-expect-error
  window.rosBridge = rosBridgeAPI;
}
