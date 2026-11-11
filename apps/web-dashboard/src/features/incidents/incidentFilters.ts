import type {
  Area,
  Incident,
  IncidentPriority,
  IncidentStatus,
} from '../../types'

export type IncidentSort = 'newest' | 'oldest' | 'priority'

export interface IncidentFilterState {
  date: string
  officerId: string
  priority: IncidentPriority | 'All'
  query: string
  sort: IncidentSort
  status: IncidentStatus | 'All'
}

export const defaultIncidentFilters: IncidentFilterState = {
  date: '',
  officerId: 'All',
  priority: 'All',
  query: '',
  sort: 'newest',
  status: 'All',
}

const priorityOrder: Record<IncidentPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
}

export function filterAndSortIncidents(
  incidents: readonly Incident[],
  filters: IncidentFilterState,
  areas: readonly Area[] = [],
): Incident[] {
  const query = filters.query.trim().toLocaleLowerCase()

  return incidents
    .filter((incident) => {
      const currentAreaName =
        areas.find((area) => area.id === incident.areaId)?.name ?? incident.areaName
      const matchesQuery =
        !query ||
        [
          incident.incidentNumber,
          incident.cameraName,
          incident.cameraId,
          currentAreaName,
          incident.location,
          incident.objectType,
        ].some((value) => value.toLocaleLowerCase().includes(query))
      const matchesStatus =
        filters.status === 'All' || incident.status === filters.status
      const matchesPriority =
        filters.priority === 'All' || incident.priority === filters.priority
      const matchesOfficer =
        filters.officerId === 'All' ||
        (filters.officerId === 'Unassigned'
          ? incident.assignedOfficerId === null
          : incident.assignedOfficerId === filters.officerId)
      const matchesDate =
        !filters.date || incident.detectedAt.slice(0, 10) === filters.date
      return (
        matchesQuery &&
        matchesStatus &&
        matchesPriority &&
        matchesOfficer &&
        matchesDate
      )
    })
    .sort((first, second) => {
      if (filters.sort === 'priority') {
        return (
          priorityOrder[first.priority] - priorityOrder[second.priority] ||
          Date.parse(second.detectedAt) - Date.parse(first.detectedAt)
        )
      }
      const difference = Date.parse(second.detectedAt) - Date.parse(first.detectedAt)
      return filters.sort === 'newest' ? difference : -difference
    })
}

export function hasActiveIncidentFilters(filters: IncidentFilterState): boolean {
  return (
    Boolean(filters.query.trim()) ||
    filters.status !== 'All' ||
    filters.priority !== 'All' ||
    filters.officerId !== 'All' ||
    Boolean(filters.date) ||
    filters.sort !== 'newest'
  )
}
