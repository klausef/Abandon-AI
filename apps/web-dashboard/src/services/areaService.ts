import { mockAreas } from '../mocks'
import type { Area, AreaInput, Camera } from '../types'

type AreaListener = () => void

function cloneArea(area: Area): Area {
  return structuredClone(area)
}

function normalizeAreaInput(input: AreaInput): AreaInput {
  return {
    name: input.name.trim(),
    city: input.city.trim(),
    province: input.province.trim(),
    description: input.description.trim(),
  }
}

export class MockAreaService {
  private areas: readonly Area[]
  private listeners = new Set<AreaListener>()
  private nextAreaNumber: number

  constructor(initialAreas: readonly Area[] = mockAreas) {
    this.areas = structuredClone(initialAreas)
    this.nextAreaNumber =
      Math.max(
        0,
        ...initialAreas.map((area) => Number(area.id.match(/(\d+)$/)?.[1] ?? 0)),
      ) + 1
  }

  getSnapshot = (): readonly Area[] => this.areas

  subscribe = (listener: AreaListener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emitChange() {
    this.listeners.forEach((listener) => listener())
  }

  private validate(input: AreaInput, excludedAreaId?: string): AreaInput {
    const normalized = normalizeAreaInput(input)
    if (!normalized.name) throw new Error('Area name is required.')
    if (!normalized.city) throw new Error('City or municipality is required.')
    if (!normalized.province) throw new Error('Province is required.')

    const duplicate = this.areas.some(
      (area) =>
        area.id !== excludedAreaId &&
        area.name.toLocaleLowerCase() === normalized.name.toLocaleLowerCase(),
    )
    if (duplicate) throw new Error('Area name must be unique.')
    return normalized
  }

  hasArea = (areaId: string): boolean =>
    this.areas.some((area) => area.id === areaId)

  getAreas(): Promise<readonly Area[]> {
    return Promise.resolve(this.areas.map(cloneArea))
  }

  getAreaById(areaId: string): Promise<Area | undefined> {
    const area = this.areas.find((item) => item.id === areaId)
    return Promise.resolve(area ? cloneArea(area) : undefined)
  }

  async createArea(input: AreaInput): Promise<Area> {
    const normalized = this.validate(input)
    const timestamp = new Date().toISOString()
    const area: Area = {
      ...normalized,
      id: `AREA-${this.nextAreaNumber.toString().padStart(3, '0')}`,
      createdAt: timestamp,
      updatedAt: timestamp,
      source: 'MOCK',
    }
    this.nextAreaNumber += 1
    this.areas = [...this.areas, area]
    this.emitChange()
    return cloneArea(area)
  }

  async updateArea(areaId: string, input: AreaInput): Promise<Area> {
    const existing = this.areas.find((area) => area.id === areaId)
    if (!existing) throw new Error(`Area ${areaId} was not found.`)

    const normalized = this.validate(input, areaId)
    const updated: Area = {
      ...existing,
      ...normalized,
      updatedAt: new Date(
        Math.max(Date.now(), Date.parse(existing.updatedAt) + 1),
      ).toISOString(),
    }
    this.areas = this.areas.map((area) => (area.id === areaId ? updated : area))
    this.emitChange()
    return cloneArea(updated)
  }

  async deleteArea(areaId: string, cameras: readonly Camera[]): Promise<boolean> {
    const existing = this.areas.find((area) => area.id === areaId)
    if (!existing) return false

    const assignedCameraCount = cameras.filter(
      (camera) => camera.areaId === areaId,
    ).length
    if (assignedCameraCount > 0) {
      const cameraLabel = assignedCameraCount === 1 ? 'camera is' : 'cameras are'
      throw new Error(
        `${existing.name} cannot be deleted while ${assignedCameraCount} ${cameraLabel} assigned to it.`,
      )
    }

    this.areas = this.areas.filter((area) => area.id !== areaId)
    this.emitChange()
    return true
  }
}

export const areaService = new MockAreaService()
