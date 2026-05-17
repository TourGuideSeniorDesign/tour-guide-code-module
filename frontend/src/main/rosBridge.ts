import { BrowserWindow, ipcMain } from "electron";
import ROSLIB from "roslib";
import {
  type BrakeCommand,
  DEFAULT_ROSBRIDGE_URL,
  type PublishResult,
  type RefSpeedCommand,
  ROS_RETRY_SECONDS,
  ROS_STATE_CHANNEL,
  type RosBridgeSnapshot,
  type TourControlMessage,
} from "../shared/rosBridge";

type TopicKey = keyof RosBridgeSnapshot["topics"];

interface TopicDefinition {
  key: TopicKey;
  name: string;
  messageType: string;
}

const IPC_GET_STATE = "ros:get-state";
const IPC_CONNECT = "ros:connect";
const IPC_DISCONNECT = "ros:disconnect";
const IPC_PUBLISH_TOUR_CONTROL = "ros:publish-tour-control";
const IPC_PUBLISH_REF_SPEED = "ros:publish-ref-speed";
const IPC_PUBLISH_EBRAKE = "ros:publish-ebrake";
const IPC_SET_JOYSTICK_ENABLED = "ros:set-joystick-enabled";
const IPC_REFRESH_JOYSTICK = "ros:refresh-joystick";

const JOYSTICK_NODE = "/joystick_control";
const ROS_PARAMETER_BOOL = 1;

const TOPICS: TopicDefinition[] = [
  {
    key: "status",
    name: "/status",
    messageType: "autogiro_interfaces/msg/Status",
  },
  {
    key: "fanSpeed",
    name: "/fan_speed",
    messageType: "autogiro_interfaces/msg/FanSpeed",
  },
  {
    key: "sensors",
    name: "sensors",
    messageType: "autogiro_interfaces/msg/Sensors",
  },
  {
    key: "refSpeed",
    name: "/ref_speed",
    messageType: "autogiro_interfaces/msg/RefSpeed",
  },
  {
    key: "tourControl",
    name: "/tour_control",
    messageType: "autogiro_interfaces/msg/TourControl",
  },
  {
    key: "battery",
    name: "/battery_status",
    messageType: "autogiro_interfaces/msg/Battery",
  },
  {
    key: "motorSpeed",
    name: "/motor_speed",
    messageType: "autogiro_interfaces/msg/Motors",
  },
  {
    key: "ebrake",
    name: "/ebrake",
    messageType: "autogiro_interfaces/msg/Brake",
  },
];

export class RosBridgeService {
  private ros: ROSLIB.Ros | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private connectionId = 0;
  private autoConnect = true;
  private subscriptions: ROSLIB.Topic[] = [];
  private tourControlPublisher: ROSLIB.Topic | null = null;
  private refSpeedPublisher: ROSLIB.Topic | null = null;
  private ebrakePublisher: ROSLIB.Topic | null = null;

  private snapshot: RosBridgeSnapshot = {
    url: DEFAULT_ROSBRIDGE_URL,
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

  registerIpc(): void {
    ipcMain.handle(IPC_GET_STATE, () => this.snapshot);
    ipcMain.handle(IPC_CONNECT, (_, url: string) => {
      this.connect(url);
    });
    ipcMain.handle(IPC_DISCONNECT, () => {
      this.disconnect();
    });
    ipcMain.handle(
      IPC_PUBLISH_TOUR_CONTROL,
      (_, message: TourControlMessage): PublishResult =>
        this.publishTourControl(message),
    );
    ipcMain.handle(
      IPC_PUBLISH_REF_SPEED,
      (_, message: RefSpeedCommand): PublishResult =>
        this.publishRefSpeed(message),
    );
    ipcMain.handle(
      IPC_PUBLISH_EBRAKE,
      (_, message: BrakeCommand): PublishResult => this.publishEbrake(message),
    );
    ipcMain.handle(
      IPC_SET_JOYSTICK_ENABLED,
      (_, enabled: boolean): Promise<PublishResult> =>
        this.setJoystickEnabled(enabled),
    );
    ipcMain.handle(
      IPC_REFRESH_JOYSTICK,
      (): Promise<PublishResult> => this.refreshJoystickControl(),
    );
  }

  start(): void {
    this.connect(this.snapshot.url);
  }

  dispose(): void {
    this.clearRetryTimers();
    this.unsubscribeAll();
    if (this.ros) {
      this.ros.close();
      this.ros = null;
    }
    ipcMain.removeHandler(IPC_GET_STATE);
    ipcMain.removeHandler(IPC_CONNECT);
    ipcMain.removeHandler(IPC_DISCONNECT);
    ipcMain.removeHandler(IPC_PUBLISH_TOUR_CONTROL);
    ipcMain.removeHandler(IPC_PUBLISH_REF_SPEED);
    ipcMain.removeHandler(IPC_PUBLISH_EBRAKE);
    ipcMain.removeHandler(IPC_SET_JOYSTICK_ENABLED);
    ipcMain.removeHandler(IPC_REFRESH_JOYSTICK);
  }

  private broadcastSnapshot(): void {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) {
        window.webContents.send(ROS_STATE_CHANNEL, this.snapshot);
      }
    }
  }

  private updateSnapshot(
    next:
      | RosBridgeSnapshot
      | ((current: RosBridgeSnapshot) => RosBridgeSnapshot),
  ): void {
    this.snapshot = typeof next === "function" ? next(this.snapshot) : next;
    this.broadcastSnapshot();
  }

  private clearRetryTimers(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private clearTopicData(): void {
    this.updateSnapshot((current) => ({
      ...current,
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
    }));
  }

  private unsubscribeAll(): void {
    for (const topic of this.subscriptions) {
      topic.unsubscribe();
    }
    this.subscriptions = [];
    this.tourControlPublisher = null;
    this.refSpeedPublisher = null;
    this.ebrakePublisher = null;
  }

  connect(url: string): void {
    this.autoConnect = true;
    this.snapshot.url = url;
    this.connectionId += 1;
    const connectionId = this.connectionId;

    this.clearRetryTimers();
    this.unsubscribeAll();

    if (this.ros) {
      this.ros.close();
      this.ros = null;
    }

    this.updateSnapshot((current) => ({
      ...current,
      url,
      connectionState: "connecting",
      retryCountdown: null,
    }));
    this.clearTopicData();

    const ros = new ROSLIB.Ros({ url });
    this.ros = ros;

    ros.on("connection", () => {
      if (connectionId !== this.connectionId) return;
      this.updateSnapshot((current) => ({
        ...current,
        connectionState: "connected",
        retryCountdown: null,
      }));
      this.attachTopicSubscriptions(ros, connectionId);
      void this.refreshJoystickControl();
    });

    ros.on("error", () => {
      if (connectionId !== this.connectionId) return;
      this.updateSnapshot((current) => ({
        ...current,
        connectionState: "error",
      }));
      this.clearTopicData();
    });

    ros.on("close", () => {
      if (connectionId !== this.connectionId) return;
      this.unsubscribeAll();
      this.ros = null;
      this.updateSnapshot((current) => ({
        ...current,
        connectionState: "disconnected",
      }));
      this.clearTopicData();
      if (this.autoConnect) {
        this.scheduleRetry();
      }
    });
  }

  disconnect(): void {
    this.autoConnect = false;
    this.clearRetryTimers();
    this.unsubscribeAll();
    if (this.ros) {
      this.ros.close();
      this.ros = null;
    }
    this.updateSnapshot((current) => ({
      ...current,
      connectionState: "disconnected",
      retryCountdown: null,
    }));
    this.clearTopicData();
  }

  publishTourControl(message: TourControlMessage): PublishResult {
    if (!this.ros || this.snapshot.connectionState !== "connected") {
      return { ok: false, error: "ROS is not connected." };
    }

    if (!this.tourControlPublisher) {
      this.tourControlPublisher = new ROSLIB.Topic({
        ros: this.ros,
        name: "/tour_control",
        messageType: "autogiro_interfaces/msg/TourControl",
        queue_size: 1,
      });
    }

    this.tourControlPublisher.publish(new ROSLIB.Message(message));
    return { ok: true };
  }

  publishRefSpeed(message: RefSpeedCommand): PublishResult {
    if (!this.ros || this.snapshot.connectionState !== "connected") {
      return { ok: false, error: "ROS is not connected." };
    }

    if (!this.refSpeedPublisher) {
      this.refSpeedPublisher = new ROSLIB.Topic({
        ros: this.ros,
        name: "/ref_speed",
        messageType: "autogiro_interfaces/msg/RefSpeed",
        queue_size: 1,
      });
    }

    this.refSpeedPublisher.publish(new ROSLIB.Message(message));
    return { ok: true };
  }

  publishEbrake(message: BrakeCommand): PublishResult {
    if (!this.ros || this.snapshot.connectionState !== "connected") {
      return { ok: false, error: "ROS is not connected." };
    }

    if (!this.ebrakePublisher) {
      this.ebrakePublisher = new ROSLIB.Topic({
        ros: this.ros,
        name: "/ebrake",
        messageType: "autogiro_interfaces/msg/Brake",
        queue_size: 1,
      });
    }

    this.ebrakePublisher.publish(new ROSLIB.Message(message));
    return { ok: true };
  }

  async setJoystickEnabled(enabled: boolean): Promise<PublishResult> {
    if (!this.ros || this.snapshot.connectionState !== "connected") {
      return { ok: false, error: "ROS is not connected." };
    }

    try {
      const response = await this.callRosService<
        {
          parameters: Array<{
            name: string;
            value: { type: number; bool_value: boolean };
          }>;
        },
        { results?: Array<{ successful: boolean; reason?: string }> }
      >(`${JOYSTICK_NODE}/set_parameters`, "rcl_interfaces/srv/SetParameters", {
        parameters: [
          {
            name: "enabled",
            value: {
              type: ROS_PARAMETER_BOOL,
              bool_value: enabled,
            },
          },
        ],
      });

      const result = response.results?.[0];
      if (!result?.successful) {
        const error =
          result?.reason || "Failed to set joystick_control.enabled.";
        this.updateJoystickControl({ enabled: null, error });
        return { ok: false, error };
      }

      this.updateJoystickControl({ enabled, error: null });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.updateJoystickControl({ enabled: null, error: message });
      return { ok: false, error: message };
    }
  }

  async refreshJoystickControl(): Promise<PublishResult> {
    if (!this.ros || this.snapshot.connectionState !== "connected") {
      return { ok: false, error: "ROS is not connected." };
    }

    try {
      const response = await this.callRosService<
        { names: string[] },
        { values?: Array<{ type: number; bool_value?: boolean }> }
      >(`${JOYSTICK_NODE}/get_parameters`, "rcl_interfaces/srv/GetParameters", {
        names: ["enabled"],
      });
      const value = response.values?.[0];
      if (!value || value.type !== ROS_PARAMETER_BOOL) {
        throw new Error("joystick_control.enabled is not available.");
      }

      this.updateJoystickControl({
        enabled: Boolean(value.bool_value),
        error: null,
      });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.updateJoystickControl({ enabled: null, error: message });
      return { ok: false, error: message };
    }
  }

  private callRosService<TRequest, TResponse>(
    name: string,
    serviceType: string,
    request: TRequest,
  ): Promise<TResponse> {
    if (!this.ros) {
      return Promise.reject(new Error("ROS is not connected."));
    }

    const service = new ROSLIB.Service<TRequest, TResponse>({
      ros: this.ros,
      name,
      serviceType,
    });

    return new Promise((resolve, reject) => {
      service.callService(request, resolve, (error) => {
        reject(new Error(error));
      });
    });
  }

  private updateJoystickControl(next: {
    enabled: boolean | null;
    error: string | null;
  }): void {
    this.updateSnapshot((current) => ({
      ...current,
      joystickControl: next,
    }));
  }

  private scheduleRetry(): void {
    this.clearRetryTimers();

    this.updateSnapshot((current) => ({
      ...current,
      retryCountdown: ROS_RETRY_SECONDS,
    }));

    this.countdownTimer = setInterval(() => {
      this.updateSnapshot((current) => ({
        ...current,
        retryCountdown:
          current.retryCountdown !== null && current.retryCountdown > 1
            ? current.retryCountdown - 1
            : null,
      }));
    }, 1000);

    this.retryTimer = setTimeout(() => {
      this.connect(this.snapshot.url);
    }, ROS_RETRY_SECONDS * 1000);
  }

  private attachTopicSubscriptions(
    ros: ROSLIB.Ros,
    connectionId: number,
  ): void {
    this.unsubscribeAll();

    this.subscriptions = TOPICS.map((definition) => {
      const topic = new ROSLIB.Topic({
        ros,
        name: definition.name,
        messageType: definition.messageType,
        queue_size: 1,
      });

      topic.subscribe((message) => {
        if (connectionId !== this.connectionId) return;
        this.updateSnapshot((current) => ({
          ...current,
          topics: {
            ...current.topics,
            [definition.key]:
              message as RosBridgeSnapshot["topics"][typeof definition.key],
          },
        }));
      });

      return topic;
    });
  }
}

export const rosBridgeService = new RosBridgeService();
