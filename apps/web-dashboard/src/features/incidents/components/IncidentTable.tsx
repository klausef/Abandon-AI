import {
  CheckCircle2,
  Eye,
  SearchCheck,
  SearchX,
  UserRoundPlus,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import type { Area, Incident } from '../../../types'
import { getAreaName } from '../../../utils/area'
import { detectionObjectLabels } from '../../../utils/detection'
import { formatDateTime, formatDuration } from '../../../utils/formatters'
import { getIncidentActions, type IncidentAction } from '../incidentPresentation'
import { IncidentPriorityBadge, IncidentStatusBadge } from './IncidentBadges'

interface IncidentTableProps {
  areas: readonly Area[]
  canPerformAction?: (action: IncidentAction, incident: Incident) => boolean
  hasActiveFilters: boolean
  incidents: readonly Incident[]
  onAction: (action: IncidentAction, incident: Incident) => void
  onClearFilters: () => void
}

const actionConfig: Record<
  Exclude<IncidentAction, 'view'>,
  { icon: LucideIcon; label: string }
> = {
  acknowledge: { icon: Eye, label: 'Acknowledge' },
  assign: { icon: UserRoundPlus, label: 'Assign Officer' },
  investigate: { icon: SearchCheck, label: 'Investigate' },
  resolve: { icon: CheckCircle2, label: 'Resolve' },
  false_alarm: { icon: XCircle, label: 'False Alarm' },
}

function IncidentActions({
  canPerformAction = () => true,
  incident,
  onAction,
}: Pick<IncidentTableProps, 'onAction' | 'canPerformAction'> & { incident: Incident }) {
  const actions = getIncidentActions(incident)
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <button
        aria-label={`View details for ${incident.incidentNumber}`}
        className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-cyan-300"
        onClick={() => onAction('view', incident)}
        title="View details"
        type="button"
      >
        <Eye aria-hidden="true" className="size-4" />
      </button>
      {actions
        .filter((action): action is Exclude<IncidentAction, 'view'> => action !== 'view')
        .filter((action) => canPerformAction(action, incident))
        .map((action) => {
          const config = actionConfig[action]
          const Icon = config.icon
          return (
            <button
              aria-label={`${config.label} ${incident.incidentNumber}`}
              className={`grid size-8 place-items-center rounded-lg transition-colors ${
                action === 'false_alarm'
                  ? 'text-slate-500 hover:bg-rose-400/10 hover:text-rose-300'
                  : 'text-slate-500 hover:bg-slate-800 hover:text-cyan-300'
              }`}
              key={action}
              onClick={() => onAction(action, incident)}
              title={config.label}
              type="button"
            >
              <Icon aria-hidden="true" className="size-4" />
            </button>
          )
        })}
    </div>
  )
}

export function IncidentTable({
  areas,
  canPerformAction,
  hasActiveFilters,
  incidents,
  onAction,
  onClearFilters,
}: IncidentTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Incident records</h2>
          <p className="mt-0.5 text-xs text-slate-500">Potential incidents awaiting human verification</p>
        </div>
        <span className="rounded border border-amber-400/20 bg-amber-400/10 px-2 py-1 font-mono text-[0.625rem] font-bold tracking-wider text-amber-300">MOCK DATA</span>
      </div>
      {incidents.length === 0 ? (
        <div className="grid min-h-72 place-items-center px-6 text-center">
          <div>
            <SearchX aria-hidden="true" className="mx-auto size-8 text-slate-700" />
            <h3 className="mt-3 text-sm font-semibold text-slate-300">
              {hasActiveFilters ? 'No incidents match these filters' : 'No incidents available'}
            </h3>
            <p className="mt-2 text-xs text-slate-600">Adjust the criteria or trigger a controlled mock alert.</p>
            {hasActiveFilters ? <Button className="mt-4" onClick={onClearFilters} size="small" variant="secondary">Clear filters</Button> : null}
          </div>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[78rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/25">
                  {['Incident Number', 'Object Type', 'Camera', 'Location', 'Unattended', 'Priority', 'Assigned Officer', 'Status', 'Detection Time', 'Actions'].map((heading) => (
                    <th className="px-3 py-3 text-[0.625rem] font-bold tracking-[0.1em] text-slate-500 uppercase first:pl-6 last:pr-6" key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {incidents.map((incident) => (
                  <tr className="hover:bg-slate-900/40" key={incident.id}>
                    <td className="px-3 py-4 pl-6">
                      <span className="font-mono text-xs font-bold text-cyan-300">{incident.incidentNumber}</span>
                      <span className="ml-2 font-mono text-[0.5rem] font-bold text-amber-300">MOCK</span>
                    </td>
                    <td className="px-3 py-4 text-xs font-semibold text-slate-300">{detectionObjectLabels[incident.objectType]}</td>
                    <td className="max-w-44 px-3 py-4">
                      <p className="truncate text-xs text-slate-300">{incident.cameraName}</p>
                      <p className="mt-1 font-mono text-[0.625rem] text-slate-600">{incident.cameraId}</p>
                    </td>
                    <td className="max-w-48 px-3 py-4 text-xs text-slate-400"><p className="truncate font-medium text-cyan-200">{areas.some((area) => area.id === incident.areaId) ? getAreaName(areas, incident.areaId) : incident.areaName}</p><p className="mt-1 truncate text-[0.625rem] text-slate-600">{incident.location}</p></td>
                    <td className="px-3 py-4 text-xs text-slate-400">{formatDuration(incident.unattendedDuration)}</td>
                    <td className="px-3 py-4"><IncidentPriorityBadge priority={incident.priority} /></td>
                    <td className="max-w-40 px-3 py-4 text-xs text-slate-400"><p className="truncate">{incident.assignedOfficerName ?? 'Unassigned'}</p></td>
                    <td className="px-3 py-4"><IncidentStatusBadge status={incident.status} /></td>
                    <td className="px-3 py-4 text-[0.6875rem] whitespace-nowrap text-slate-500">{formatDateTime(incident.detectedAt)}</td>
                      <td className="px-3 py-4 pr-6"><IncidentActions canPerformAction={canPerformAction} incident={incident} onAction={onAction} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-slate-800/70 xl:hidden">
            {incidents.map((incident) => (
              <article className="p-4 sm:p-5" key={incident.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-cyan-300">{incident.incidentNumber}</span>
                    <span className="ml-2 font-mono text-[0.5rem] font-bold text-amber-300">MOCK</span>
                    <p className="mt-1.5 text-sm font-semibold text-slate-200">{detectionObjectLabels[incident.objectType]} · {areas.some((area) => area.id === incident.areaId) ? getAreaName(areas, incident.areaId) : incident.areaName}</p>
                    <p className="mt-1 text-xs text-slate-500">{incident.location}</p>
                  </div>
                  <IncidentStatusBadge status={incident.status} />
                </div>
                <div className="mt-4 grid gap-3 text-xs text-slate-500 sm:grid-cols-2">
                  <p><span className="block text-[0.625rem] text-slate-700">Camera</span>{incident.cameraName} ({incident.cameraId})</p>
                  <p><span className="block text-[0.625rem] text-slate-700">Officer</span>{incident.assignedOfficerName ?? 'Unassigned'}</p>
                  <p><span className="block text-[0.625rem] text-slate-700">Unattended</span>{formatDuration(incident.unattendedDuration)}</p>
                  <p><span className="block text-[0.625rem] text-slate-700">Detected</span>{formatDateTime(incident.detectedAt)}</p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
                  <IncidentPriorityBadge priority={incident.priority} />
                  <IncidentActions canPerformAction={canPerformAction} incident={incident} onAction={onAction} />
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
