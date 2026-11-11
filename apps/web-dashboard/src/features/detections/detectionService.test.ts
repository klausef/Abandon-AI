import { describe, expect, it, vi } from 'vitest'
import { mockCameras, mockDetections } from '../../mocks'
import { MockDetectionService } from '../../services'

describe('MockDetectionService', () => {
  it('loads the four deterministic initial detection records', async () => {
    const service = new MockDetectionService(mockDetections)
    const detections = await service.getDetections()

    expect(detections).toHaveLength(4)
    expect(detections.map((detection) => detection.id)).toEqual([
      'DET-001',
      'DET-002',
      'DET-003',
      'DET-004',
    ])
    expect(
      detections.every((detection) =>
        mockCameras.some((camera) => camera.id === detection.cameraId),
      ),
    ).toBe(true)
  })

  it('generates deterministic events only for online monitored cameras', () => {
    const service = new MockDetectionService([])
    const eligibleCamera = mockCameras[0]
    const event = service.generateDetection(
      [mockCameras[3], { ...mockCameras[1], monitoringEnabled: false }, eligibleCamera],
      new Date('2026-11-09T10:00:00.000Z'),
    )

    expect(event).toMatchObject({
      id: 'DET-001',
      cameraId: eligibleCamera.id,
      objectClass: 'person',
      trackingId: 1,
      confidence: 0.95,
      mock: true,
    })
    expect(event?.boundingBox.x).toBeGreaterThanOrEqual(0)
    expect(
      (event?.boundingBox.x ?? 0) + (event?.boundingBox.width ?? 0),
    ).toBeLessThanOrEqual(1)
  })

  it('does not generate events for offline or paused cameras', () => {
    const service = new MockDetectionService([])
    const offlineCamera = mockCameras[3]
    const pausedCamera = { ...mockCameras[0], monitoringEnabled: false }

    expect(service.generateDetection([offlineCamera])).toBeUndefined()
    expect(service.generateDetection([pausedCamera])).toBeUndefined()
    expect(service.getSnapshot()).toHaveLength(0)
  })

  it('notifies every subscriber when events are generated or cleared', () => {
    const service = new MockDetectionService(mockDetections)
    const firstListener = vi.fn()
    const secondListener = vi.fn()
    service.subscribe(firstListener)
    service.subscribe(secondListener)

    service.generateDetection([mockCameras[0]])
    expect(firstListener).toHaveBeenCalledTimes(1)
    expect(secondListener).toHaveBeenCalledTimes(1)
    expect(service.getSnapshot()).toHaveLength(5)

    service.clearEvents()
    expect(firstListener).toHaveBeenCalledTimes(2)
    expect(secondListener).toHaveBeenCalledTimes(2)
    expect(service.getSnapshot()).toHaveLength(0)
  })
})
