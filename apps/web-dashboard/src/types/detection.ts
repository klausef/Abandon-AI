import type { DateTimeString } from './common'

/** Retained for the incident domain, which uses display-case object labels. */
export type DetectedObjectType =
  | 'Person'
  | 'Backpack'
  | 'Handbag'
  | 'Suitcase'
  | 'Duffel Bag'
  | 'Shopping Bag'
  | 'Briefcase'
  | 'Bag'
  | 'Bottle'
  | 'Mug'
  | 'Cup'
  | 'Box'
  | 'Package'
  | 'Parcel'

export type DetectionObjectClass =
  | 'person'
  | 'backpack'
  | 'handbag'
  | 'suitcase'
  | 'duffel_bag'
  | 'shopping_bag'
  | 'briefcase'
  | 'bag'
  | 'bottle'
  | 'mug'
  | 'cup'
  | 'box'
  | 'package'
  | 'parcel'

export type DetectionStatus =
  | 'detected'
  | 'tracking'
  | 'stationary'
  | 'unattended_monitoring'
  | 'potential_incident'

/** Coordinates normalized from 0 to 1 for responsive overlays. */
export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface DetectionCameraSnapshot {
  areaId: string
  areaName: string
  name: string
  location: string
  building: string
}

export interface Detection {
  id: string
  cameraId: string
  objectClass: DetectionObjectClass
  trackingId: number
  /** Confidence score represented as a decimal from 0 to 1. */
  confidence: number
  timestamp: DateTimeString
  boundingBox: BoundingBox
  status: DetectionStatus
  cameraSnapshot: DetectionCameraSnapshot
  mock: true
}
