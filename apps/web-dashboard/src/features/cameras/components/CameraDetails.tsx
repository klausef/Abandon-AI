import {
  CalendarDays,
  Camera as CameraIcon,
  Clock3,
  Edit3,
  MapPin,
  Monitor,
  Network,
  RadioTower,
} from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { Area, Camera } from '../../../types'
import { findArea, formatAreaPlace } from '../../../utils/area'
import { formatDateTime } from '../../../utils/formatters'
import {
  CameraConnectionStatusBadge,
  CameraMonitoringStatusBadge,
} from './CameraStatusBadge'

interface CameraDetailsProps {
  areas: readonly Area[]
  canEdit?: boolean
  camera: Camera | null
  onClose: () => void
  onEdit: (camera: Camera) => void
  open: boolean
}

function DetailItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <dt className="text-[0.6875rem] font-medium tracking-wide text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm text-slate-200">{value || 'Not specified'}</dd>
    </div>
  )
}

function formatInstalledDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date)
}

export function CameraDetails({
  areas,
  canEdit = true,
  camera,
  onClose,
  onEdit,
  open,
}: CameraDetailsProps) {
  if (!camera) {
    return null
  }
  const area = findArea(areas, camera.areaId)

  return (
    <Dialog
      description="Review simulated camera metadata and monitoring state."
      onClose={onClose}
      open={open}
      size="large"
      title="Camera Details"
    >
      <div className="p-5 sm:p-6">
        <div className="relative grid aspect-video max-h-[23rem] min-h-52 place-items-center overflow-hidden rounded-xl border border-slate-700 bg-[#03080d]">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.05)_1px,transparent_1px)] [background-size:32px_32px]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-1/3 h-px bg-cyan-300/20 shadow-[0_0_20px_rgba(34,211,238,0.25)]"
          />
          <div className="relative text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
              <CameraIcon aria-hidden="true" className="size-6" />
            </div>
            <p className="mt-4 font-mono text-xs font-bold tracking-[0.2em] text-cyan-300">
              SIMULATED CAMERA FEED
            </p>
            <p className="mt-2 text-xs text-slate-600">No live CCTV stream connected</p>
          </div>
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <StatusBadge tone="amber">MOCK</StatusBadge>
            <CameraConnectionStatusBadge status={camera.status} />
          </div>
          <p className="absolute right-4 bottom-4 font-mono text-[0.625rem] text-slate-600">
            {camera.id} · {camera.resolution}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold text-slate-50">{camera.name}</h3>
              <span className="font-mono text-xs font-bold text-cyan-300">{camera.id}</span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-400">
              <MapPin aria-hidden="true" className="size-3.5" />
              {area?.name ?? `Unknown area (${camera.areaId})`} · {camera.location}
            </p>
          </div>
          <CameraMonitoringStatusBadge camera={camera} />
        </div>

        <dl className="grid gap-x-8 gap-y-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Demo Area" value={area?.name ?? `Unknown area (${camera.areaId})`} />
          <DetailItem label="City / Province" value={area ? formatAreaPlace(area) : 'Area unavailable'} />
          <DetailItem label="Camera Type" value={camera.cameraType} />
          <DetailItem label="Landmark & Floor" value={`${camera.building} · ${camera.floor || 'Floor not specified'}`} />
          <DetailItem label="IP Address" value={camera.ipAddress || 'Not assigned'} />
          <DetailItem label="Resolution" value={camera.resolution} />
          <DetailItem label="Installed Date" value={formatInstalledDate(camera.installedDate)} />
          <DetailItem label="Last Connection" value={formatDateTime(camera.lastConnection)} />
        </dl>

        <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950/30 p-4 sm:grid-cols-[auto_1fr]">
          <RadioTower aria-hidden="true" className="mt-0.5 size-4 text-slate-500" />
          <div>
            <p className="text-xs font-semibold text-slate-300">Coverage description</p>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              {camera.description || 'No description has been provided.'}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-xl border border-slate-800/70 bg-slate-950/20 p-4 text-[0.6875rem] text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
          <span className="flex items-center gap-2">
            <Network aria-hidden="true" className="size-3.5" />
            {camera.ipAddress || 'No IP assigned'}
          </span>
          <span className="flex items-center gap-2">
            <Monitor aria-hidden="true" className="size-3.5" />
            {camera.resolution}
          </span>
          <span className="flex items-center gap-2">
            <CalendarDays aria-hidden="true" className="size-3.5" />
            Installed {formatInstalledDate(camera.installedDate)}
          </span>
          <span className="flex items-center gap-2">
            <Clock3 aria-hidden="true" className="size-3.5" />
            Updated {formatDateTime(camera.updatedAt)}
          </span>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-800 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <Button onClick={onClose} variant="secondary">
          Close
        </Button>
        {canEdit ? <Button onClick={() => onEdit(camera)}>
          <Edit3 aria-hidden="true" className="size-4" />
          Edit Camera
        </Button> : null}
      </div>
    </Dialog>
  )
}
