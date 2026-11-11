import { describe, expect, it } from 'vitest'
import { mockAreas, mockCameras } from '../../mocks'
import {
  defaultCameraFilters,
  filterAndSortCameras,
  type CameraFilterState,
} from './cameraFilters'

function filterWith(overrides: Partial<CameraFilterState>) {
  return filterAndSortCameras(
    mockCameras,
    { ...defaultCameraFilters, ...overrides },
    mockAreas,
  )
}

describe('camera filtering and sorting', () => {
  it('searches by camera ID', () => {
    expect(filterWith({ query: 'CAM-002' }).map((camera) => camera.id)).toEqual([
      'CAM-002',
    ])
  })

  it('searches by camera name without case sensitivity', () => {
    expect(
      filterWith({ query: 'city plaza activity area camera' }).map((camera) => camera.id),
    ).toEqual(['CAM-003'])
  })

  it('filters by connection status', () => {
    expect(filterWith({ status: 'Offline' }).map((camera) => camera.id)).toEqual([
      'CAM-004',
    ])
  })

  it('filters by assigned area', () => {
    expect(
      filterWith({ areaId: 'AREA-002' }).map((camera) => camera.id),
    ).toEqual(['CAM-002'])
  })

  it('searches by area name and region', () => {
    expect(
      filterWith({ query: 'Valencia Public Market' }).map((camera) => camera.id),
    ).toEqual(['CAM-001'])
    expect(filterWith({ query: 'Bukidnon' })).toHaveLength(5)
  })

  it('filters by camera type', () => {
    expect(
      filterWith({ cameraType: 'Bullet Camera' }).map((camera) => camera.id),
    ).toEqual(['CAM-005', 'CAM-001'])
  })

  it('sorts by name and status', () => {
    const descending = filterWith({ sort: 'name-desc' })
    const byStatus = filterWith({ sort: 'status' })

    expect(descending[0].name).toBe('Transport Terminal Waiting Area Camera')
    expect(byStatus.at(-1)?.status).toBe('Offline')
  })

  it('returns an empty collection when nothing matches', () => {
    expect(filterWith({ query: 'no-such-camera' })).toEqual([])
  })
})
