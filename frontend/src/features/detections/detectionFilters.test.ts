import { describe, expect, it } from 'vitest'
import { mockAreas, mockCameras, mockDetections } from '../../mocks'
import { resolveDetectionCamera } from '../../utils/detection'
import {
  defaultDetectionFilters,
  filterAndSortDetections,
  type DetectionFilterState,
} from './detectionFilters'

function filterWith(overrides: Partial<DetectionFilterState>) {
  return filterAndSortDetections(
    mockDetections,
    mockCameras,
    { ...defaultDetectionFilters, ...overrides },
    mockAreas,
  )
}

describe('detection history filtering', () => {
  it('searches by detection ID, object category, and camera', () => {
    expect(filterWith({ query: 'DET-001' }).map((item) => item.id)).toEqual([
      'DET-001',
    ])
    expect(filterWith({ query: 'handbag' }).map((item) => item.id)).toEqual([
      'DET-003',
    ])
    expect(filterWith({ query: 'Public Market Entrance Camera' }).map((item) => item.id)).toEqual([
      'DET-002',
    ])
    expect(filterWith({ query: 'Valencia Transport Terminal' }).map((item) => item.id)).toEqual([
      'DET-001',
    ])
  })

  it('filters by object, camera, status, and date', () => {
    expect(filterWith({ objectClass: 'suitcase' }).map((item) => item.id)).toEqual([
      'DET-004',
    ])
    expect(filterWith({ cameraId: 'CAM-003' }).map((item) => item.id)).toEqual([
      'DET-003',
    ])
    expect(
      filterWith({ status: 'unattended_monitoring' }).map((item) => item.id),
    ).toEqual(['DET-001'])
    expect(filterWith({ date: '2026-11-09' })).toHaveLength(4)
  })

  it('sorts newest and oldest records', () => {
    expect(filterWith({ sort: 'newest' })[0].id).toBe('DET-004')
    expect(filterWith({ sort: 'oldest' })[0].id).toBe('DET-001')
  })

  it('preserves a camera snapshot when the camera no longer exists', () => {
    const detection = mockDetections[0]
    const camerasWithoutSource = mockCameras.filter(
      (camera) => camera.id !== detection.cameraId,
    )
    const camera = resolveDetectionCamera(detection, camerasWithoutSource)

    expect(camera.isRemoved).toBe(true)
    expect(camera.name).toBe('Transport Terminal Waiting Area Camera')
    expect(camera.location).toBe('Passenger Waiting Area')
  })
})
