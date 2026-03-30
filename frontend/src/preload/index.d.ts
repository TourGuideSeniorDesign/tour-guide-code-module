import type { ElectronAPI } from "@electron-toolkit/preload";
import type {
	PublishResult,
	RosBridgeSnapshot,
	TourControlMessage,
} from "../shared/rosBridge";

interface RosBridgeAPI {
	connect: (url: string) => Promise<void>;
	disconnect: () => Promise<void>;
	getState: () => Promise<RosBridgeSnapshot>;
	publishTourControl: (message: TourControlMessage) => Promise<PublishResult>;
	onState: (listener: (snapshot: RosBridgeSnapshot) => void) => () => void;
}

declare global {
	interface Window {
		electron: ElectronAPI;
		rosBridge: RosBridgeAPI;
	}
}
