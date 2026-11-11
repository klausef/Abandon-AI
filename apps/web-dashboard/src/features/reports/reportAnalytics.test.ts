import { describe, expect, it, vi } from 'vitest'
import { mockDetections, mockIncidents } from '../../mocks'
import {
  buildIncidentTrends,
  countBy,
  downloadCsv,
  filterReportData,
  incidentsToCsv,
  officerPerformance,
} from './reportAnalytics'

describe('report analytics', () => {
  it('filters incidents and detections by inclusive date range', () => {
    expect(
      filterReportData(mockIncidents, mockDetections, '2026-11-09', '2026-11-09'),
    ).toMatchObject({ incidents: { length: 3 }, detections: { length: 4 } })
    expect(
      filterReportData(mockIncidents, mockDetections, '2026-11-10', ''),
    ).toMatchObject({ incidents: [], detections: [] })
  })

  it('builds daily, weekly, and monthly trends', () => {
    expect(buildIncidentTrends(mockIncidents, 'day')).toEqual([
      { period: '2026-11-09', count: 3 },
    ])
    expect(buildIncidentTrends(mockIncidents, 'week')[0].count).toBe(3)
    expect(buildIncidentTrends(mockIncidents, 'month')).toEqual([
      { period: '2026-11', count: 3 },
    ])
  })

  it('aggregates categories, priorities, statuses, and locations', () => {
    expect(countBy(mockIncidents, (item) => item.objectType)).toHaveLength(3)
    expect(countBy(mockIncidents, (item) => item.priority)).toEqual(
      expect.arrayContaining([
        { name: 'critical', value: 1 },
        { name: 'high', value: 1 },
        { name: 'normal', value: 1 },
      ]),
    )
    expect(countBy(mockIncidents, (item) => item.status)).toHaveLength(3)
    expect(countBy(mockIncidents, (item) => item.location)).toHaveLength(3)
  })

  it('calculates officer response performance', () => {
    const performance = officerPerformance(mockIncidents)
    expect(performance).toHaveLength(2)
    expect(performance.find((item) => item.officer === 'Security Officer 02')).toMatchObject({
      assigned: 1,
      resolved: 1,
    })
  })

  it('exports quoted CSV and starts a browser download', () => {
    const csv = incidentsToCsv(mockIncidents)
    expect(csv).toContain('"Incident Number"')
    expect(csv).toContain('"INC-2026-0001"')
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    downloadCsv(csv, 'report.csv')
    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })
})
