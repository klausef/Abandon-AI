import type {
  Area,
  Camera,
  Detection,
  DetectionObjectClass,
  DetectionStatus,
} from '../types'

export const detectionObjectClasses = [
  'person',
  'backpack',
  'handbag',
  'suitcase',
  'duffel_bag',
  'shopping_bag',
  'briefcase',
  'bag',
  'bottle',
  'mug',
  'cup',
  'box',
  'package',
  'parcel',
] as const satisfies readonly DetectionObjectClass[]

export const incidentObjectClasses = detectionObjectClasses.filter(
  (objectClass) => objectClass !== 'person',
)

export const detectionObjectLabels: Record<DetectionObjectClass, string> = {
  person: 'Person',
  backpack: 'Backpack',
  handbag: 'Handbag',
  suitcase: 'Suitcase',
  duffel_bag: 'Duffel Bag',
  shopping_bag: 'Shopping Bag',
  briefcase: 'Briefcase',
  bag: 'Bag',
  bottle: 'Bottle',
  mug: 'Coffee Mug',
  cup: 'Cup',
  box: 'Cardboard Box',
  package: 'Package',
  parcel: 'Parcel',
}

export const detectionObjectColors: Record<DetectionObjectClass, string> = {
  person: '#22d3ee',
  backpack: '#f59e0b',
  handbag: '#a78bfa',
  suitcase: '#fb7185',
  duffel_bag: '#fbbf24',
  shopping_bag: '#c084fc',
  briefcase: '#f97316',
  bag: '#eab308',
  bottle: '#2dd4bf',
  mug: '#38bdf8',
  cup: '#0ea5e9',
  box: '#fb923c',
  package: '#f59e0b',
  parcel: '#d97706',
}

export const detectionObjectToneClasses: Record<DetectionObjectClass, string> = {
  person: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  backpack: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  handbag: 'border-violet-400/20 bg-violet-400/10 text-violet-300',
  suitcase: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
  duffel_bag: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  shopping_bag: 'border-violet-400/20 bg-violet-400/10 text-violet-300',
  briefcase: 'border-orange-400/20 bg-orange-400/10 text-orange-300',
  bag: 'border-yellow-400/20 bg-yellow-400/10 text-yellow-300',
  bottle: 'border-teal-400/20 bg-teal-400/10 text-teal-300',
  mug: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
  cup: 'border-blue-400/20 bg-blue-400/10 text-blue-300',
  box: 'border-orange-400/20 bg-orange-400/10 text-orange-300',
  package: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  parcel: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200',
}

export const detectionStatusLabels: Record<DetectionStatus, string> = {
  detected: 'Detected',
  tracking: 'Tracking',
  stationary: 'Stationary',
  unattended_monitoring: 'Unattended Monitoring',
  potential_incident: 'Potential Incident',
}

export interface ResolvedDetectionCamera {
  areaId: string
  areaName: string
  building: string
  id: string
  isRemoved: boolean
  location: string
  name: string
}

export function formatDetectionConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

export function resolveDetectionCamera(
  detection: Detection,
  cameras: readonly Camera[],
  areas: readonly Area[] = [],
): ResolvedDetectionCamera {
  const camera = cameras.find((item) => item.id === detection.cameraId)

  if (camera) {
    return {
      areaId: camera.areaId,
      areaName:
        areas.find((area) => area.id === camera.areaId)?.name ??
        detection.cameraSnapshot.areaName,
      id: camera.id,
      name: camera.name,
      location: camera.location,
      building: camera.building,
      isRemoved: false,
    }
  }

  return {
    areaId: detection.cameraSnapshot.areaId,
    areaName: detection.cameraSnapshot.areaName,
    id: detection.cameraId,
    name: detection.cameraSnapshot.name || `Removed Camera (${detection.cameraId})`,
    location: detection.cameraSnapshot.location || 'Location unavailable',
    building: detection.cameraSnapshot.building || 'Building unavailable',
    isRemoved: true,
  }
}

export function formatBoundingBox(detection: Detection): string {
  const { x, y, width, height } = detection.boundingBox
  return `x ${x.toFixed(2)}, y ${y.toFixed(2)}, w ${width.toFixed(2)}, h ${height.toFixed(2)}`
}
