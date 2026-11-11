import type { Detection, Incident } from '../../types'

export type TrendGranularity = 'day' | 'week' | 'month'

export function withinRange(timestamp: string, start: string, end: string) {
  const date = timestamp.slice(0, 10)
  return (!start || date >= start) && (!end || date <= end)
}

export function filterReportData(
  incidents: readonly Incident[],
  detections: readonly Detection[],
  start: string,
  end: string,
) {
  return {
    incidents: incidents.filter((item) => withinRange(item.detectedAt, start, end)),
    detections: detections.filter((item) => withinRange(item.timestamp, start, end)),
  }
}

function periodKey(timestamp: string, granularity: TrendGranularity) {
  const date = new Date(timestamp)
  if (granularity === 'month') return timestamp.slice(0, 7)
  if (granularity === 'day') return timestamp.slice(0, 10)
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() - day + 1)
  return date.toISOString().slice(0, 10)
}

export function buildIncidentTrends(
  incidents: readonly Incident[],
  granularity: TrendGranularity,
) {
  const counts = new Map<string, number>()
  incidents.forEach((incident) => {
    const key = periodKey(incident.detectedAt, granularity)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })
  return [...counts.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([period, count]) => ({ period, count }))
}

export function countBy<T>(items: readonly T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>()
  items.forEach((item) => {
    const key = getKey(item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })
  return [...counts.entries()].map(([name, value]) => ({ name, value }))
}

export function officerPerformance(incidents: readonly Incident[]) {
  const assigned = new Map<string, Incident[]>()
  incidents.forEach((incident) => {
    if (!incident.assignedOfficerName) return
    const current = assigned.get(incident.assignedOfficerName) ?? []
    assigned.set(incident.assignedOfficerName, [...current, incident])
  })
  return [...assigned.entries()].map(([officer, records]) => {
    const acknowledgeMinutes = records
      .filter((item) => item.acknowledgedAt)
      .map(
        (item) =>
          (Date.parse(item.acknowledgedAt!) - Date.parse(item.detectedAt)) / 60_000,
      )
    return {
      officer,
      assigned: records.length,
      resolved: records.filter((item) => item.status === 'resolved').length,
      averageResponseMinutes: acknowledgeMinutes.length
        ? Math.round(
            acknowledgeMinutes.reduce((sum, value) => sum + value, 0) /
              acknowledgeMinutes.length,
          )
        : 0,
    }
  })
}

function csvCell(value: string | number | null) {
  const text = value === null ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export function incidentsToCsv(incidents: readonly Incident[]) {
  const headers = [
    'Incident Number', 'Object', 'Camera', 'Area', 'Location', 'Priority', 'Status',
    'Officer', 'Detected At', 'Acknowledged At', 'Resolved At',
  ]
  const rows = incidents.map((item) => [
    item.incidentNumber, item.objectType, item.cameraName, item.areaName, item.location,
    item.priority, item.status, item.assignedOfficerName, item.detectedAt,
    item.acknowledgedAt, item.resolvedAt,
  ])
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
}

export function downloadCsv(csv: string, filename: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
