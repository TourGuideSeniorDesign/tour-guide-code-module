export type {
  AutogiroInterfacesStatus as StatusMessage,
  AutogiroInterfacesFanSpeed as FanSpeedMessage
} from './ros-msgs.gen'

export type RosConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'
