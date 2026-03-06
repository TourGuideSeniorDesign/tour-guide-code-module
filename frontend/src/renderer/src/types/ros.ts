export type {
  AutogiroInterfacesStatus,
  AutogiroInterfacesFanSpeed,
  AutogiroInterfacesSensors,
  AutogiroInterfacesRefSpeed
} from './ros-msgs.gen'

export type RosConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'
