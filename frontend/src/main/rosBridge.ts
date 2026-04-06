import { BrowserWindow, ipcMain } from "electron";
import ROSLIB from "roslib";
import {
  DEFAULT_ROSBRIDGE_URL,
  type PublishResult,
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
];

export class RosBridgeService {
  private ros: ROSLIB.Ros | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private connectionId = 0;
  private autoConnect = true;
  private subscriptions: ROSLIB.Topic[] = [];
  private publisher: ROSLIB.Topic | null = null;

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
      },
    }));
  }

  private unsubscribeAll(): void {
    for (const topic of this.subscriptions) {
      topic.unsubscribe();
    }
    this.subscriptions = [];
    this.publisher = null;
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

    if (!this.publisher) {
      this.publisher = new ROSLIB.Topic({
        ros: this.ros,
        name: "/tour_control",
        messageType: "autogiro_interfaces/msg/TourControl",
        queue_size: 1,
      });
    }

    this.publisher.publish(new ROSLIB.Message(message));
    return { ok: true };
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
