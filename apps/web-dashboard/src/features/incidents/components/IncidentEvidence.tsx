import { Camera as CameraIcon } from 'lucide-react'
import type { Camera, Detection, Incident } from '../../../types'
import {
  detectionObjectLabels,
  formatDetectionConfidence,
} from '../../../utils/detection'
import { formatDateTime } from '../../../utils/formatters'
import { DetectionBoundingBox } from '../../monitoring/components/DetectionBoundingBox'
import { DetectionStatusBadge } from '../../detections/components/DetectionStatusBadge'

interface IncidentEvidenceProps {
  camera: Camera & { isRemoved: boolean }
  detection: Detection
  incident: Incident
}

export function IncidentEvidence({ camera, detection, incident }: IncidentEvidenceProps) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Simulated detection evidence</h3>
          <p className="mt-1 text-[0.6875rem] text-slate-600">Placeholder preview — not real CCTV evidence</p>
        </div>
        <DetectionStatusBadge status={detection.status} />
      </div>
      <div className="relative mt-4 aspect-video overflow-hidden rounded-xl border border-slate-700 bg-[radial-gradient(circle_at_45%_20%,#153044_0%,#07111b_55%,#020609_100%)]">
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] [background-size:8%_12%]" />
        <span className="absolute top-3 left-3 z-20 rounded border border-amber-400/20 bg-slate-950/75 px-2 py-1 font-mono text-[0.5625rem] font-bold text-amber-300">SIMULATED EVIDENCE · MOCK</span>
        <DetectionBoundingBox detection={detection} />
        <span className="absolute right-3 bottom-3 z-20 flex items-center gap-1.5 rounded bg-slate-950/75 px-2 py-1 font-mono text-[0.5625rem] text-slate-400"><CameraIcon className="size-3" />{camera.id} · {camera.location}</span>
      </div>
      <div className="mt-3 grid gap-3 rounded-lg border border-slate-800 bg-slate-950/25 p-3 text-xs text-slate-400 sm:grid-cols-4">
        <p><span className="block text-[0.625rem] text-slate-600">Detection</span>{incident.detectionId}</p>
        <p><span className="block text-[0.625rem] text-slate-600">Object</span>{detectionObjectLabels[incident.objectType]}</p>
        <p><span className="block text-[0.625rem] text-slate-600">Tracking</span>ID {incident.trackingId} · {formatDetectionConfidence(incident.confidence)}</p>
        <p><span className="block text-[0.625rem] text-slate-600">Timestamp</span>{formatDateTime(detection.timestamp)}</p>
      </div>
    </section>
  )
}
