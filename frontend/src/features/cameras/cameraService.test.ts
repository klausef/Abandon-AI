import { beforeEach, describe, expect, it } from 'vitest'
import { mockCameras } from '../../mocks'
import { MockCameraService } from '../../services'
import type { CreateCameraInput, UpdateCameraInput } from '../../types'

const newCameraInput: CreateCameraInput = {
  areaId: 'AREA-001',
  name: 'Science Hall Entrance Camera',
  location: 'North Entrance',
  building: 'Science Hall',
  floor: 'Ground Floor',
  cameraType: 'IP Camera',
  ipAddress: '192.168.1.120',
  resolution: '1920x1080',
  description: 'Simulated science hall entrance coverage.',
}

describe('MockCameraService', () => {
  let service: MockCameraService

  beforeEach(() => {
    service = new MockCameraService(mockCameras)
  })

  it('returns the five initial mock cameras', async () => {
    const cameras = await service.getCameras()

    expect(cameras).toHaveLength(5)
    expect(cameras.map((camera) => camera.id)).toEqual([
      'CAM-001',
      'CAM-002',
      'CAM-003',
      'CAM-004',
      'CAM-005',
    ])
  })

  it('creates a unique offline camera with monitoring disabled', async () => {
    const created = await service.createCamera(newCameraInput)
    const cameras = await service.getCameras()

    expect(created.id).toBe('CAM-006')
    expect(created.status).toBe('Offline')
    expect(created.monitoringEnabled).toBe(false)
    expect(created.source).toBe('MOCK')
    expect(cameras).toHaveLength(6)
  })

  it('rejects a camera assigned to an unknown area', async () => {
    await expect(
      service.createCamera({ ...newCameraInput, areaId: 'AREA-999' }),
    ).rejects.toThrow('Select a valid area')
  })

  it('updates camera information while preserving its ID and created date', async () => {
    const original = await service.getCameraById('CAM-001')
    const update: UpdateCameraInput = {
      ...newCameraInput,
      name: 'Updated Entrance Camera',
      status: 'Maintenance',
    }
    const updated = await service.updateCamera('CAM-001', update)

    expect(updated.id).toBe('CAM-001')
    expect(updated.name).toBe('Updated Entrance Camera')
    expect(updated.status).toBe('Maintenance')
    expect(updated.createdAt).toBe(original?.createdAt)
    expect(updated.updatedAt).not.toBe(original?.updatedAt)
  })

  it('toggles monitoring without changing an offline camera status', async () => {
    const beforeToggle = await service.getCameraById('CAM-004')
    const afterToggle = await service.toggleMonitoring('CAM-004')

    expect(beforeToggle?.status).toBe('Offline')
    expect(afterToggle.status).toBe('Offline')
    expect(afterToggle.monitoringEnabled).toBe(!beforeToggle?.monitoringEnabled)
  })

  it('deletes only after the delete operation is explicitly called', async () => {
    expect(await service.getCameraById('CAM-003')).toBeDefined()

    const deleted = await service.deleteCamera('CAM-003')

    expect(deleted).toBe(true)
    expect(await service.getCameraById('CAM-003')).toBeUndefined()
    expect(await service.getCameras()).toHaveLength(4)
  })
})
