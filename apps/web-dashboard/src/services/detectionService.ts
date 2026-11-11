import { mockDetections } from '../mocks'
import type {
  Camera,
  Detection,
  IncidentObjectType,
  DetectionObjectClass,
  DetectionStatus,
} from '../types'
import { areaService } from './areaService'

type DetectionListener = () => void

interface GenerationPattern {
  boundingBox: Detection['boundingBox']
  confidence: number
  objectClass: DetectionObjectClass
  status: DetectionStatus
}

const generationPatterns: readonly GenerationPattern[] = [
  {
    objectClass: 'person',
    confidence: 0.95,
    status: 'tracking',
    boundingBox: { x: 0.12, y: 0.16, width: 0.21, height: 0.67 },
  },
  {
    objectClass: 'backpack',
    confidence: 0.89,
    status: 'stationary',
    boundingBox: { x: 0.52, y: 0.57, width: 0.16, height: 0.25 },
  },
  {
    objectClass: 'handbag',
    confidence: 0.87,
    status: 'unattended_monitoring',
    boundingBox: { x: 0.7, y: 0.61, width: 0.14, height: 0.2 },
  },
  {
    objectClass: 'suitcase',
    confidence: 0.93,
    status: 'potential_incident',
    boundingBox: { x: 0.31, y: 0.49, width: 0.2, height: 0.36 },
  },
  {
    objectClass: 'person',
    confidence: 0.92,
    status: 'detected',
    boundingBox: { x: 0.61, y: 0.13, width: 0.19, height: 0.7 },
  },
]

function cloneDetection(detection: Detection): Detection {
  return structuredClone(detection)
}

function getLargestNumericSuffix(values: readonly string[]): number {
  return Math.max(
    0,
    ...values.map((value) => {
      const suffix = Number(value.match(/(\d+)$/)?.[1] ?? 0)
      return Number.isFinite(suffix) ? suffix : 0
    }),
  )
}

export class MockDetectionService {
  private detections: readonly Detection[]
  private generationIndex = 0
  private listeners = new Set<DetectionListener>()
  private nextDetectionNumber: number
  private nextTrackingId: number

  constructor(initialDetections: readonly Detection[] = mockDetections) {
    this.detections = structuredClone(initialDetections)
    this.nextDetectionNumber =
      getLargestNumericSuffix(initialDetections.map((detection) => detection.id)) + 1
    this.nextTrackingId =
      Math.max(0, ...initialDetections.map((detection) => detection.trackingId)) + 1
  }

  getSnapshot = (): readonly Detection[] => this.detections

  subscribe = (listener: DetectionListener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emitChange() {
    this.listeners.forEach((listener) => listener())
  }

  getDetections(): Promise<readonly Detection[]> {
    return Promise.resolve(this.detections.map(cloneDetection))
  }

  listDetections(): Promise<readonly Detection[]> {
    return this.getDetections()
  }

  getDetectionById(detectionId: string): Promise<Detection | undefined> {
    const detection = this.detections.find((item) => item.id === detectionId)
    return Promise.resolve(detection ? cloneDetection(detection) : undefined)
  }

  createPotentialIncidentDetection(
    camera: Camera,
    objectClass: IncidentObjectType,
    timestamp = new Date(),
  ): Detection {
    if (camera.status !== 'Online' || !camera.monitoringEnabled) {
      throw new Error('Only online cameras with monitoring enabled can create mock alerts.')
    }

    const boxes: Record<IncidentObjectType, Detection['boundingBox']> = {
      backpack: { x: 0.42, y: 0.56, width: 0.17, height: 0.27 },
      handbag: { x: 0.66, y: 0.61, width: 0.14, height: 0.2 },
      suitcase: { x: 0.3, y: 0.48, width: 0.21, height: 0.37 },
      duffel_bag: { x: 0.38, y: 0.6, width: 0.24, height: 0.22 },
      shopping_bag: { x: 0.61, y: 0.58, width: 0.16, height: 0.24 },
      briefcase: { x: 0.43, y: 0.63, width: 0.23, height: 0.16 },
      bag: { x: 0.49, y: 0.6, width: 0.18, height: 0.23 },
      bottle: { x: 0.55, y: 0.64, width: 0.07, height: 0.19 },
      mug: { x: 0.47, y: 0.67, width: 0.1, height: 0.12 },
      cup: { x: 0.52, y: 0.68, width: 0.09, height: 0.11 },
      box: { x: 0.4, y: 0.56, width: 0.26, height: 0.28 },
      package: { x: 0.41, y: 0.59, width: 0.24, height: 0.23 },
      parcel: { x: 0.44, y: 0.61, width: 0.22, height: 0.2 },
    }
    const confidence = objectClass === 'suitcase' ? 0.95 : 0.92
    const detection: Detection = {
      id: `DET-${this.nextDetectionNumber.toString().padStart(3, '0')}`,
      cameraId: camera.id,
      objectClass,
      trackingId: this.nextTrackingId,
      confidence,
      timestamp: timestamp.toISOString(),
      boundingBox: boxes[objectClass],
      status: 'potential_incident',
      cameraSnapshot: {
        areaId: camera.areaId,
        areaName:
          areaService.getSnapshot().find((area) => area.id === camera.areaId)?.name ??
          `Unknown area (${camera.areaId})`,
        name: camera.name,
        location: camera.location,
        building: camera.building,
      },
      mock: true,
    }
    this.nextDetectionNumber += 1
    this.nextTrackingId += 1
    this.detections = [detection, ...this.detections]
    this.emitChange()
    return cloneDetection(detection)
  }

  generateDetection(cameras: readonly Camera[], timestamp = new Date()): Detection | undefined {
    const eligibleCameras = cameras.filter(
      (camera) => camera.status === 'Online' && camera.monitoringEnabled,
    )

    if (eligibleCameras.length === 0) {
      return undefined
    }

    const pattern = generationPatterns[this.generationIndex % generationPatterns.length]
    const camera = eligibleCameras[this.generationIndex % eligibleCameras.length]
    const detection: Detection = {
      id: `DET-${this.nextDetectionNumber.toString().padStart(3, '0')}`,
      cameraId: camera.id,
      objectClass: pattern.objectClass,
      trackingId: this.nextTrackingId,
      confidence: pattern.confidence,
      timestamp: timestamp.toISOString(),
      boundingBox: { ...pattern.boundingBox },
      status: pattern.status,
      cameraSnapshot: {
        areaId: camera.areaId,
        areaName:
          areaService.getSnapshot().find((area) => area.id === camera.areaId)?.name ??
          `Unknown area (${camera.areaId})`,
        name: camera.name,
        location: camera.location,
        building: camera.building,
      },
      mock: true,
    }

    this.generationIndex += 1
    this.nextDetectionNumber += 1
    this.nextTrackingId += 1
    this.detections = [detection, ...this.detections]
    this.emitChange()
    return cloneDetection(detection)
  }

  clearEvents(): void {
    if (this.detections.length === 0) {
      return
    }

    this.detections = []
    this.emitChange()
  }
}

export const detectionService = new MockDetectionService()
