import type {
  Camera,
  CameraStatus,
  CameraType,
  CreateCameraInput,
  UpdateCameraInput,
} from '../../types'

export interface CameraFormValues {
  areaId: string
  name: string
  location: string
  building: string
  floor: string
  cameraType: CameraType
  ipAddress: string
  resolution: string
  description: string
  status: CameraStatus
}

export type CameraFormErrors = Partial<Record<keyof CameraFormValues, string>>

export const cameraTypeOptions: readonly CameraType[] = [
  'IP Camera',
  'Dome Camera',
  'Bullet Camera',
]

export const cameraStatusOptions: readonly CameraStatus[] = [
  'Online',
  'Offline',
  'Maintenance',
]

export const resolutionOptions = [
  '1920x1080',
  '1280x720',
  '2560x1440',
  '3840x2160',
] as const

export const emptyCameraFormValues: CameraFormValues = {
  areaId: '',
  name: '',
  location: '',
  building: '',
  floor: '',
  cameraType: 'IP Camera',
  ipAddress: '',
  resolution: '1920x1080',
  description: '',
  status: 'Offline',
}

export function isValidIPv4Address(value: string): boolean {
  if (value.trim() === '') {
    return true
  }

  const octets = value.trim().split('.')
  return (
    octets.length === 4 &&
    octets.every((octet) => {
      if (!/^\d{1,3}$/.test(octet)) {
        return false
      }

      const numericOctet = Number(octet)
      return numericOctet >= 0 && numericOctet <= 255
    })
  )
}

export function validateCameraForm(
  values: CameraFormValues,
): CameraFormErrors {
  const errors: CameraFormErrors = {}

  if (!values.name.trim()) {
    errors.name = 'Camera name is required.'
  }

  if (!values.areaId.trim()) {
    errors.areaId = 'Area assignment is required.'
  }

  if (!values.location.trim()) {
    errors.location = 'Location is required.'
  }

  if (!values.building.trim()) {
    errors.building = 'Building is required.'
  }

  if (!isValidIPv4Address(values.ipAddress)) {
    errors.ipAddress = 'Enter a valid IPv4 address, for example 192.168.1.120.'
  }

  return errors
}

export function cameraToFormValues(camera: Camera): CameraFormValues {
  return {
    areaId: camera.areaId,
    name: camera.name,
    location: camera.location,
    building: camera.building,
    floor: camera.floor,
    cameraType: camera.cameraType,
    ipAddress: camera.ipAddress,
    resolution: camera.resolution,
    description: camera.description,
    status: camera.status,
  }
}

export function toCreateCameraInput(
  values: CameraFormValues,
): CreateCameraInput {
  const { status: _status, ...input } = values
  return input
}

export function toUpdateCameraInput(
  values: CameraFormValues,
): UpdateCameraInput {
  return values
}
