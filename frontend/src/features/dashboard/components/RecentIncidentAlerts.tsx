import { ArrowUpRight, Clock3, MapPin, PackageSearch } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { Camera, Incident, IncidentPriority, IncidentStatus } from '../../../types'
import {
  formatDateTime,
  formatDuration,
} from '../../../utils/formatters'
import { formatDetectionConfidence } from '../../../utils/detection'

type BadgeTone = 'cyan' | 'green' | 'amber' | 'red' | 'slate'

interface RecentIncidentAlertsProps {
  cameras: readonly Camera[]
  incidents: readonly Incident[]
}

const priorityTones: Record<IncidentPriority, BadgeTone> = {
  low: 'slate',
  normal: 'cyan',
  high: 'amber',
  critical: 'red',
}

const statusTones: Record<IncidentStatus, BadgeTone> = {
  new: 'red',
  acknowledged: 'amber',
  investigating: 'cyan',
  resolved: 'green',
  false_alarm: 'slate',
}

const incidentStatusLabels: Record<IncidentStatus, string> = {
  new: 'New',
  acknowledged: 'Acknowledged',
  investigating: 'Investigating',
  resolved: 'Resolved',
  false_alarm: 'False Alarm',
}

export function RecentIncidentAlerts({
  cameras,
  incidents,
}: RecentIncidentAlertsProps) {
  const recentIncidents = [...incidents]
    .sort((first, second) => Date.parse(second.detectedAt) - Date.parse(first.detectedAt))
    .slice(0, 5)
  const cameraNames = new Map(cameras.map((camera) => [camera.id, camera.name]))

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-800/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg border border-rose-400/15 bg-rose-400/10 text-rose-300">
            <PackageSearch aria-hidden="true" className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Recent incident alerts</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Latest abandoned-object review events
            </p>
          </div>
        </div>
        <Link
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
          to="/incidents"
        >
          View all incidents
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>

      {recentIncidents.length > 0 ? (
        <div className="divide-y divide-slate-800/70">
          {recentIncidents.map((incident) => (
            <article
              className="grid gap-4 px-5 py-4 transition-colors hover:bg-slate-900/40 sm:px-6 lg:grid-cols-[minmax(15rem,1.2fr)_minmax(12rem,1fr)_auto] lg:items-center"
              key={incident.incidentNumber}
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-slate-700/80 bg-slate-800/70 text-slate-300">
                  <PackageSearch aria-hidden="true" className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-mono text-xs font-bold tracking-wide text-slate-100">
                      {incident.incidentNumber}
                    </h3>
                    <span className="rounded border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[0.5625rem] font-bold tracking-wider text-amber-300">
                      {incident.mock ? 'MOCK' : 'LIVE'}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-sm font-medium text-slate-300">
                    {incident.objectType.charAt(0).toUpperCase() + incident.objectType.slice(1)} ·{' '}
                    {cameraNames.get(incident.cameraId) ?? incident.cameraName}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-[0.6875rem] text-slate-500">
                <p className="flex items-center gap-1.5">
                  <MapPin aria-hidden="true" className="size-3 shrink-0" />
                  <span className="truncate">{incident.location}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock3 aria-hidden="true" className="size-3 shrink-0" />
                  {formatDateTime(incident.detectedAt)} · unattended{' '}
                  {formatDuration(incident.unattendedDuration)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <span className="text-xs font-semibold text-slate-300">
                  {formatDetectionConfidence(incident.confidence)}
                </span>
                <StatusBadge tone={priorityTones[incident.priority]}>
                  {incident.priority.charAt(0).toUpperCase() + incident.priority.slice(1)}
                </StatusBadge>
                <StatusBadge dot tone={statusTones[incident.status]}>
                  {incidentStatusLabels[incident.status]}
                </StatusBadge>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="grid min-h-48 place-items-center px-5 text-center text-sm text-slate-500">
          No mock incident alerts are available.
        </div>
      )}
    </Card>
  )
}
