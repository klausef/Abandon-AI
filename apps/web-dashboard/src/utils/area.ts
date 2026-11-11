import type { Area } from '../types'

export function findArea(
  areas: readonly Area[],
  areaId: string,
): Area | undefined {
  return areas.find((area) => area.id === areaId)
}

export function formatAreaPlace(area: Area): string {
  return `${area.city}, ${area.province}`
}

export function getAreaName(areas: readonly Area[], areaId: string): string {
  return findArea(areas, areaId)?.name ?? `Unknown area (${areaId})`
}
