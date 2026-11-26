import { mockAreas, mockCameras } from '../mocks'
import type {
  Camera,
  CreateCameraInput,
  UpdateCameraInput,
} from '../types'
import { areaService } from './areaService'

function cloneCamera(camera: Camera): Camera {
  return structuredClone(camera)
}

function getNextTimestamp(previousTimestamp?: string): string {
  const currentTime = Date.now()
  const previousTime = previousTimestamp ? Date.parse(previousTimestamp) : 0
  return new Date(Math.max(currentTime, previousTime + 1)).toISOString()
}

function normalizeInput<T extends CreateCameraInput>(input: T): T {
  return {
    ...input,
    areaId: input.areaId.trim(),
    name: input.name.trim(),
    location: input.location.trim(),
    building: input.building.trim(),
    floor: input.floor.trim(),
    ipAddress: input.ipAddress.trim(),
    resolution: input.resolution.trim(),
    description: input.description.trim(),
  }
}

export class MockCameraService {
  private cameras: Camera[]
  private nextCameraNumber: number
  private readonly areaExists: (areaId: string) => boolean

  constructor(
    initialCameras: readonly Camera[] = mockCameras,
    areaExists: (areaId: string) => boolean = (areaId) =>
      mockAreas.some((area) => area.id === areaId),
  ) {
    this.cameras = [...structuredClone(initialCameras)]
    this.areaExists = areaExists
    this.nextCameraNumber =
      Math.max(
        0,
        ...initialCameras.map((camera) => {
          const numericId = Number(camera.id.replace(/^CAM-/, ''))
          return Number.isFinite(numericId) ? numericId : 0
        }),
      ) + 1
  }

  getCameras(): Promise<readonly Camera[]> {
    return Promise.resolve(this.cameras.map(cloneCamera))
  }

  listCameras(): Promise<readonly Camera[]> {
    return this.getCameras()
  }

  getCameraById(cameraId: string): Promise<Camera | undefined> {
    const camera = this.cameras.find((item) => item.id === cameraId)
    return Promise.resolve(camera ? cloneCamera(camera) : undefined)
  }

  getCamera(cameraId: string): Promise<Camera | undefined> {
    return this.getCameraById(cameraId)
  }

  createCamera(input: CreateCameraInput): Promise<Camera> {
    if (!this.areaExists(input.areaId.trim())) {
      return Promise.reject(new Error('Select a valid area for this camera.'))
    }
    const timestamp = getNextTimestamp()
    const normalizedInput = normalizeInput(input)
    const camera: Camera = {
      ...normalizedInput,
      id: `CAM-${this.nextCameraNumber.toString().padStart(3, '0')}`,
      status: 'Offline',
      monitoringEnabled: false,
      installedDate: timestamp.slice(0, 10),
      lastConnection: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      source: 'MOCK',
    }

    this.nextCameraNumber += 1
    this.cameras = [...this.cameras, camera]
    return Promise.resolve(cloneCamera(camera))
  }

  updateCamera(cameraId: string, input: UpdateCameraInput): Promise<Camera> {
    const cameraIndex = this.cameras.findIndex((camera) => camera.id === cameraId)

    if (cameraIndex < 0) {
      return Promise.reject(new Error(`Camera ${cameraId} was not found.`))
    }
    if (!this.areaExists(input.areaId.trim())) {
      return Promise.reject(new Error('Select a valid area for this camera.'))
    }

    const existingCamera = this.cameras[cameraIndex]
    const updatedCamera: Camera = {
      ...existingCamera,
      ...normalizeInput(input),
      id: existingCamera.id,
      updatedAt: getNextTimestamp(existingCamera.updatedAt),
      source: 'MOCK',
    }

    this.cameras = this.cameras.map((camera, index) =>
      index === cameraIndex ? updatedCamera : camera,
    )
    return Promise.resolve(cloneCamera(updatedCamera))
  }

  deleteCamera(cameraId: string): Promise<boolean> {
    const originalLength = this.cameras.length
    this.cameras = this.cameras.filter((camera) => camera.id !== cameraId)
    return Promise.resolve(this.cameras.length < originalLength)
  }

  toggleMonitoring(cameraId: string): Promise<Camera> {
    const cameraIndex = this.cameras.findIndex((camera) => camera.id === cameraId)

    if (cameraIndex < 0) {
      return Promise.reject(new Error(`Camera ${cameraId} was not found.`))
    }

    const existingCamera = this.cameras[cameraIndex]
    const updatedCamera: Camera = {
      ...existingCamera,
      monitoringEnabled: !existingCamera.monitoringEnabled,
      updatedAt: getNextTimestamp(existingCamera.updatedAt),
    }

    this.cameras = this.cameras.map((camera, index) =>
      index === cameraIndex ? updatedCamera : camera,
    )
    return Promise.resolve(cloneCamera(updatedCamera))
  }
}

export const cameraService = new MockCameraService(mockCameras, areaService.hasArea)
