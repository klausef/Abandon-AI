import type {
  Area,
  Camera,
  Detection,
  DetectionObjectClass,
  DetectionStatus,
} from '../../types'
import {
  detectionObjectLabels,
  resolveDetectionCamera,
} from '../../utils/detection'

export type DetectionSort = 'newest' | 'oldest'

export interface DetectionFilterState {
  cameraId: string
  date: string
  objectClass: DetectionObjectClass | 'All'
  query: string
  sort: DetectionSort
  status: DetectionStatus | 'All'
}

export const defaultDetectionFilters: DetectionFilterState = {
  cameraId: 'All',
  date: '',
  objectClass: 'All',
  query: '',
  sort: 'newest',
  status: 'All',
}

export function filterAndSortDetections(
  detections: readonly Detection[],
  cameras: readonly Camera[],
  filters: DetectionFilterState,
  areas: readonly Area[] = [],
): Detection[] {
  const query = filters.query.trim().toLocaleLowerCase()

  return detections
    .filter((detection) => {
      const camera = resolveDetectionCamera(detection, cameras, areas)
      const matchesQuery =
        query === '' ||
        [
          detection.id,
          detectionObjectLabels[detection.objectClass],
          detection.objectClass,
          detection.cameraId,
          camera.name,
          camera.areaName,
          camera.location,
          camera.building,
        ].some((value) => value.toLocaleLowerCase().includes(query))
      const matchesObject =
        filters.objectClass === 'All' ||
        detection.objectClass === filters.objectClass
      const matchesCamera =
        filters.cameraId === 'All' || detection.cameraId === filters.cameraId
      const matchesStatus =
        filters.status === 'All' || detection.status === filters.status
      const matchesDate =
        filters.date === '' || detection.timestamp.slice(0, 10) === filters.date

      return (
        matchesQuery &&
        matchesObject &&
        matchesCamera &&
        matchesStatus &&
        matchesDate
      )
    })
    .sort((first, second) => {
      const difference = Date.parse(second.timestamp) - Date.parse(first.timestamp)
      return filters.sort === 'newest' ? difference : -difference
    })
}

export function hasActiveDetectionFilters(filters: DetectionFilterState): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.objectClass !== 'All' ||
    filters.cameraId !== 'All' ||
    filters.status !== 'All' ||
    filters.date !== '' ||
    filters.sort !== 'newest'
  )
}
