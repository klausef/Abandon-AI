import type { DataSource, DateTimeString } from './common'

export type CameraStatus = 'Online' | 'Offline' | 'Maintenance'
export type CameraType = 'IP Camera' | 'Dome Camera' | 'Bullet Camera'

export interface Camera {
  id: string
  areaId: string
  name: string
  location: string
  building: string
  floor: string
  cameraType: CameraType
  /** Simulated private-network address. No real camera connection is attempted. */
  ipAddress: string
  status: CameraStatus
  monitoringEnabled: boolean
  resolution: string
  installedDate: string
  lastConnection: DateTimeString
  description: string
  createdAt: DateTimeString
  updatedAt: DateTimeString
  source: DataSource
}

export interface CreateCameraInput {
  areaId: string
  name: string
  location: string
  building: string
  floor: string
  cameraType: CameraType
  ipAddress: string
  resolution: string
  description: string
}

export interface UpdateCameraInput extends CreateCameraInput {
  status: CameraStatus
}
