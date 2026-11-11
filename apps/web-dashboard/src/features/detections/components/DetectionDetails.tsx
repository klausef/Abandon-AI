import { Camera as CameraIcon, Crosshair, MapPin, ScanSearch } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { Area, Camera, Detection } from '../../../types'
import {
  detectionObjectLabels,
  formatBoundingBox,
  formatDetectionConfidence,
  resolveDetectionCamera,
} from '../../../utils/detection'
import { formatDateTime } from '../../../utils/formatters'
import { DetectionBoundingBox } from '../../monitoring/components/DetectionBoundingBox'
import { DetectionStatusBadge } from './DetectionStatusBadge'

interface DetectionDetailsProps {
  areas: readonly Area[]
  cameras: readonly Camera[]
  detection: Detection
  onClose: () => void
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.6875rem] font-medium tracking-wide text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm text-slate-200">{value}</dd>
    </div>
  )
}

export function DetectionDetails({
  areas,
  cameras,
  detection,
  onClose,
}: DetectionDetailsProps) {
  const camera = resolveDetectionCamera(detection, cameras, areas)

  return (
    <Dialog
      description="Review the simulated evidence and normalized tracking metadata."
      onClose={onClose}
      open
      size="large"
      title="Detection Details"
    >
      <div className="p-5 sm:p-6">
        <div className="relative aspect-video max-h-[24rem] min-h-52 overflow-hidden rounded-xl border border-slate-700 bg-[radial-gradient(circle_at_45%_20%,#153044_0%,#07111b_55%,#020609_100%)]">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] [background-size:8%_12%]"
          />
          <div aria-hidden="true" className="absolute right-[10%] bottom-[10%] h-[55%] w-[36%] border border-slate-400/10 bg-slate-400/5 [clip-path:polygon(12%_20%,85%_0,100%_100%,0_100%)]" />
          <div className="absolute top-3 left-3 z-20 flex gap-2">
            <StatusBadge tone="amber">MOCK DATA</StatusBadge>
            <span className="rounded border border-slate-600 bg-slate-950/70 px-2 py-1 font-mono text-[0.5625rem] text-slate-300">
              SIMULATED EVIDENCE PREVIEW
            </span>
          </div>
          <DetectionBoundingBox detection={detection} />
          <div className="absolute right-3 bottom-3 z-20 flex items-center gap-1.5 rounded bg-slate-950/70 px-2 py-1 font-mono text-[0.5625rem] text-slate-400">
            <CameraIcon aria-hidden="true" className="size-3" />
            {camera.id} · {camera.location}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-mono text-lg font-bold text-cyan-300">{detection.id}</h3>
              <span className="rounded border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[0.5625rem] font-bold text-amber-300">
                MOCK
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              {detectionObjectLabels[detection.objectClass]} · Tracking ID{' '}
              {detection.trackingId}
            </p>
          </div>
          <DetectionStatusBadge status={detection.status} />
        </div>

        <dl className="grid gap-x-8 gap-y-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Object Category" value={detectionObjectLabels[detection.objectClass]} />
          <DetailItem label="Confidence" value={formatDetectionConfidence(detection.confidence)} />
          <DetailItem label="Tracking ID" value={String(detection.trackingId)} />
          <DetailItem label="Camera" value={`${camera.name} (${camera.id})`} />
          <DetailItem label="Area" value={camera.areaName} />
          <DetailItem label="Location" value={`${camera.location} · ${camera.building}`} />
          <DetailItem label="Timestamp" value={formatDateTime(detection.timestamp)} />
        </dl>

        <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950/30 p-4 sm:grid-cols-[auto_1fr]">
          <Crosshair aria-hidden="true" className="mt-0.5 size-4 text-violet-300" />
          <div>
            <p className="text-xs font-semibold text-slate-300">Normalized bounding box</p>
            <p className="mt-1.5 font-mono text-xs text-slate-500">
              {formatBoundingBox(detection)}
            </p>
            <p className="mt-1 text-[0.625rem] text-slate-600">
              Coordinates are normalized from 0 to 1 and scale with the preview.
            </p>
          </div>
        </div>

        {camera.isRemoved ? (
          <div className="mt-4 flex gap-3 rounded-xl border border-amber-400/15 bg-amber-400/5 p-4 text-xs leading-5 text-amber-100/70">
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-300" />
            This camera is no longer in the active inventory. Preserved event metadata is displayed.
          </div>
        ) : null}
      </div>

      <div className="flex justify-end border-t border-slate-800 px-5 py-4 sm:px-6">
        <Button onClick={onClose} variant="secondary">
          <ScanSearch aria-hidden="true" className="size-4" />
          Close Details
        </Button>
      </div>
    </Dialog>
  )
}
