export type {
  AutogiroInterfacesStatus,
  AutogiroInterfacesFanSpeed,
  AutogiroInterfacesSensors
} from './ros-msgs.gen'

export type RosConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'
