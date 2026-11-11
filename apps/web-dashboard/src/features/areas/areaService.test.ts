import { beforeEach, describe, expect, it } from 'vitest'
import { mockAreas, mockCameras } from '../../mocks'
import { MockAreaService } from '../../services'

describe('MockAreaService', () => {
  let service: MockAreaService

  beforeEach(() => {
    service = new MockAreaService(mockAreas)
  })

  it('returns the five Valencia City demo areas', async () => {
    const areas = await service.getAreas()
    expect(areas).toHaveLength(5)
    expect(areas.map((area) => area.id)).toEqual([
      'AREA-001',
      'AREA-002',
      'AREA-003',
      'AREA-004',
      'AREA-005',
    ])
    expect(areas.every((area) => area.source === 'MOCK')).toBe(true)
  })

  it('creates and normalizes a uniquely identified area', async () => {
    const created = await service.createArea({
      name: '  Community Park  ',
      city: ' Valencia City ',
      province: ' Bukidnon ',
      description: '  Demo park area.  ',
    })

    expect(created).toMatchObject({
      id: 'AREA-006',
      name: 'Community Park',
      city: 'Valencia City',
      province: 'Bukidnon',
      description: 'Demo park area.',
      source: 'MOCK',
    })
  })

  it('rejects case-insensitive duplicate names', async () => {
    await expect(
      service.createArea({
        name: 'valencia public market',
        city: 'Valencia City',
        province: 'Bukidnon',
        description: '',
      }),
    ).rejects.toThrow('Area name must be unique.')
  })

  it('updates metadata while preserving identity and creation time', async () => {
    const original = await service.getAreaById('AREA-003')
    const updated = await service.updateArea('AREA-003', {
      name: 'Valencia Community Plaza',
      city: 'Valencia City',
      province: 'Bukidnon',
      description: 'Updated demo description.',
    })

    expect(updated.id).toBe('AREA-003')
    expect(updated.createdAt).toBe(original?.createdAt)
    expect(updated.updatedAt).not.toBe(original?.updatedAt)
  })

  it('blocks deletion while a camera is assigned', async () => {
    await expect(service.deleteArea('AREA-001', mockCameras)).rejects.toThrow(
      'cannot be deleted while 1 camera is assigned',
    )
    expect(await service.getAreaById('AREA-001')).toBeDefined()
  })

  it('deletes an unassigned area', async () => {
    const created = await service.createArea({
      name: 'Unassigned Demo Area',
      city: 'Valencia City',
      province: 'Bukidnon',
      description: '',
    })
    expect(await service.deleteArea(created.id, mockCameras)).toBe(true)
    expect(await service.getAreaById(created.id)).toBeUndefined()
  })
})
