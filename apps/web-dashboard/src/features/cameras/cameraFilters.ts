import type { Area, Camera, CameraStatus, CameraType } from '../../types'

export type CameraSort = 'name-asc' | 'name-desc' | 'status'

export interface CameraFilterState {
  areaId: string
  cameraType: CameraType | 'All'
  query: string
  sort: CameraSort
  status: CameraStatus | 'All'
}

export const defaultCameraFilters: CameraFilterState = {
  areaId: 'All',
  cameraType: 'All',
  query: '',
  sort: 'name-asc',
  status: 'All',
}

const statusOrder: Record<CameraStatus, number> = {
  Online: 0,
  Offline: 1,
  Maintenance: 2,
}

export function filterAndSortCameras(
  cameras: readonly Camera[],
  filters: CameraFilterState,
  areas: readonly Area[],
): Camera[] {
  const normalizedQuery = filters.query.trim().toLocaleLowerCase()

  return cameras
    .filter((camera) => {
      const area = areas.find((item) => item.id === camera.areaId)
      const matchesQuery =
        normalizedQuery === '' ||
        [
          camera.id,
          camera.name,
          camera.ipAddress,
          camera.location,
          camera.building,
          area?.name ?? '',
          area?.city ?? '',
          area?.province ?? '',
        ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
      const matchesStatus =
        filters.status === 'All' || camera.status === filters.status
      const matchesArea =
        filters.areaId === 'All' || camera.areaId === filters.areaId
      const matchesType =
        filters.cameraType === 'All' || camera.cameraType === filters.cameraType

      return matchesQuery && matchesStatus && matchesArea && matchesType
    })
    .sort((first, second) => {
      if (filters.sort === 'name-desc') {
        return second.name.localeCompare(first.name)
      }

      if (filters.sort === 'status') {
        const statusDifference =
          statusOrder[first.status] - statusOrder[second.status]
        return statusDifference || first.name.localeCompare(second.name)
      }

      return first.name.localeCompare(second.name)
    })
}

export function hasActiveCameraFilters(filters: CameraFilterState): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.status !== 'All' ||
    filters.areaId !== 'All' ||
    filters.cameraType !== 'All' ||
    filters.sort !== 'name-asc'
  )
}
