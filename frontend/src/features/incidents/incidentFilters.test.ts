import { describe, expect, it } from 'vitest'
import { mockAreas, mockIncidents } from '../../mocks'
import {
  defaultIncidentFilters,
  filterAndSortIncidents,
  type IncidentFilterState,
} from './incidentFilters'

function filterWith(overrides: Partial<IncidentFilterState>) {
  return filterAndSortIncidents(
    mockIncidents,
    { ...defaultIncidentFilters, ...overrides },
    mockAreas,
  )
}

describe('incident filters', () => {
  it('searches by number, camera, location, and object', () => {
    expect(filterWith({ query: 'INC-2026-0001' })).toHaveLength(1)
    expect(filterWith({ query: 'Commercial District Loading Area Camera' })[0].id).toBe(
      'incident-0002',
    )
    expect(filterWith({ query: 'Public Activity Area' })[0].id).toBe('incident-0003')
    expect(filterWith({ query: 'Valencia Transport Terminal' })[0].id).toBe(
      'incident-0001',
    )
    expect(filterWith({ query: 'backpack' })[0].id).toBe('incident-0001')
  })

  it('filters by status, priority, officer, and date', () => {
    expect(filterWith({ status: 'resolved' })).toHaveLength(1)
    expect(filterWith({ priority: 'critical' })[0].id).toBe('incident-0002')
    expect(filterWith({ officerId: 'SEC-002' })[0].id).toBe('incident-0003')
    expect(filterWith({ officerId: 'Unassigned' })[0].id).toBe('incident-0001')
    expect(filterWith({ date: '2026-11-09' })).toHaveLength(3)
  })

  it('sorts newest, oldest, and highest priority', () => {
    expect(filterWith({ sort: 'newest' })[0].id).toBe('incident-0002')
    expect(filterWith({ sort: 'oldest' })[0].id).toBe('incident-0001')
    expect(filterWith({ sort: 'priority' })[0].priority).toBe('critical')
  })
})
