import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  SearchCheck,
  UserRoundPlus,
  XCircle,
} from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import type {
  Camera,
  Area,
  Detection,
  Incident,
  IncidentActivity,
  InvestigationNote,
} from '../../../types'
import {
  detectionObjectLabels,
  formatDetectionConfidence,
} from '../../../utils/detection'
import { formatDateTime, formatDuration } from '../../../utils/formatters'
import { getAreaName } from '../../../utils/area'
import { CameraConnectionStatusBadge } from '../../cameras/components/CameraStatusBadge'
import {
  getIncidentActions,
  resolveIncidentCamera,
  resolveIncidentDetection,
} from '../incidentPresentation'
import { IncidentPriorityBadge, IncidentStatusBadge } from './IncidentBadges'
import { IncidentEvidence } from './IncidentEvidence'
import { IncidentTimeline } from './IncidentTimeline'
import { InvestigationNotes } from './InvestigationNotes'

interface IncidentDetailsProps {
  areas: readonly Area[]
  canManage?: boolean
  activities: readonly IncidentActivity[]
  cameras: readonly Camera[]
  detections: readonly Detection[]
  incident: Incident
  notes: readonly InvestigationNote[]
  onAcknowledge: () => void
  onAddNote: (content: string) => Promise<void>
  onAssign: () => void
  onClose: () => void
  onFalseAlarm: () => void
  onInvestigate: () => void
  onResolve: () => void
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[0.625rem] font-semibold tracking-wide text-slate-600 uppercase">{label}</dt><dd className="mt-1.5 text-sm text-slate-200">{value}</dd></div>
}

export function IncidentDetails({
  areas,
  canManage = true,
  activities,
  cameras,
  detections,
  incident,
  notes,
  onAcknowledge,
  onAddNote,
  onAssign,
  onClose,
  onFalseAlarm,
  onInvestigate,
  onResolve,
}: IncidentDetailsProps) {
  const camera = resolveIncidentCamera(incident, cameras)
  const detection = resolveIncidentDetection(incident, detections)
  const actions = getIncidentActions(incident)
  const areaName = areas.some((area) => area.id === camera.areaId)
    ? getAreaName(areas, camera.areaId)
    : incident.areaName
  const assignmentActivity = [...activities]
    .reverse()
    .find((activity) => activity.type === 'assigned' || activity.type === 'unassigned')

  return (
    <Dialog description="Review evidence and complete human security verification." onClose={onClose} open size="wide" title="Incident Details">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-mono text-xl font-bold text-cyan-300">{incident.incidentNumber}</h3>
              <span className="rounded border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[0.5625rem] font-bold text-amber-300">MOCK</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">{incident.description}</p>
          </div>
          <div className="flex flex-wrap gap-2"><IncidentPriorityBadge priority={incident.priority} /><IncidentStatusBadge status={incident.status} /></div>
        </div>

        <div className="mt-5 flex gap-3 rounded-xl border border-amber-400/15 bg-amber-400/5 p-4 text-xs leading-5 text-amber-100/70">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
          This is a simulated AI-generated potential incident, not a confirmed security threat. Human verification is required.
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.7fr)]">
          <div className="space-y-7">
            <section>
              <h3 className="text-sm font-semibold text-slate-200">Incident information</h3>
              <dl className="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                <InfoItem label="Object" value={detectionObjectLabels[incident.objectType]} />
                <InfoItem label="Confidence" value={formatDetectionConfidence(incident.confidence)} />
                <InfoItem label="Tracking ID" value={String(incident.trackingId)} />
                <InfoItem label="Unattended" value={formatDuration(incident.unattendedDuration)} />
                <InfoItem label="Detected" value={formatDateTime(incident.detectedAt)} />
                <InfoItem label="Acknowledged" value={incident.acknowledgedAt ? formatDateTime(incident.acknowledgedAt) : 'Not acknowledged'} />
                <InfoItem label="Resolved" value={incident.resolvedAt ? formatDateTime(incident.resolvedAt) : 'Open'} />
                <InfoItem label="Detection ID" value={incident.detectionId} />
              </dl>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-950/25 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Camera & assignment</h3>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400"><MapPin className="size-3.5" />{areaName} · {camera.location} · {camera.building}</p>
                  <p className="mt-1 font-mono text-[0.625rem] text-slate-600">{camera.name} ({camera.id}) · {camera.areaId}</p>
                  {camera.isRemoved ? <p className="mt-1 text-[0.625rem] text-amber-300">Camera removed — preserved snapshot displayed</p> : null}
                </div>
                <CameraConnectionStatusBadge status={camera.status} />
              </div>
              <div className="mt-4 grid gap-3 border-t border-slate-800 pt-4 sm:grid-cols-2">
                <InfoItem label="Assigned Officer" value={incident.assignedOfficerName ?? 'Unassigned'} />
                <InfoItem label="Assignment Date" value={assignmentActivity ? formatDateTime(assignmentActivity.timestamp) : 'Not assigned'} />
              </div>
            </section>

            <IncidentEvidence camera={camera} detection={detection} incident={incident} />
            <InvestigationNotes incident={incident} notes={notes} onAddNote={onAddNote} />

            {incident.resolutionNotes ? (
              <section className="rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-4">
                <h3 className="text-xs font-semibold text-emerald-200">Resolution / false-alarm notes</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{incident.resolutionNotes}</p>
              </section>
            ) : null}
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
            <IncidentTimeline activities={activities} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 px-5 py-4 sm:px-6">
        <Button onClick={onClose} variant="secondary">Close</Button>
        {canManage && actions.includes('acknowledge') ? <Button onClick={onAcknowledge}><CheckCircle2 className="size-4" />Acknowledge</Button> : null}
        {canManage && actions.includes('assign') ? <Button onClick={onAssign} variant="secondary"><UserRoundPlus className="size-4" />Assign Officer</Button> : null}
        {canManage && actions.includes('investigate') ? <Button onClick={onInvestigate}><SearchCheck className="size-4" />Investigate</Button> : null}
        {canManage && actions.includes('resolve') ? <Button onClick={onResolve}><CheckCircle2 className="size-4" />Resolve</Button> : null}
        {canManage && actions.includes('false_alarm') ? <Button onClick={onFalseAlarm} variant="danger"><XCircle className="size-4" />False Alarm</Button> : null}
      </div>
    </Dialog>
  )
}
