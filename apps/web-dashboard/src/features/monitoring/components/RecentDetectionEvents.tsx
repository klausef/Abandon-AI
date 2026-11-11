import { ArrowUpRight, ScanSearch } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui/Card'
import type { Area, Camera, Detection } from '../../../types'
import { formatDateTime } from '../../../utils/formatters'
import {
  detectionObjectLabels,
  detectionStatusLabels,
  formatDetectionConfidence,
  resolveDetectionCamera,
} from '../../../utils/detection'

interface RecentDetectionEventsProps {
  areas: readonly Area[]
  cameras: readonly Camera[]
  detections: readonly Detection[]
}

export function RecentDetectionEvents({
  areas,
  cameras,
  detections,
}: RecentDetectionEventsProps) {
  const recentEvents = [...detections]
    .sort((first, second) => Date.parse(second.timestamp) - Date.parse(first.timestamp))
    .slice(0, 6)

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg border border-violet-400/15 bg-violet-400/10 text-violet-300">
            <ScanSearch aria-hidden="true" className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Recent detection events</h2>
            <p className="mt-0.5 text-xs text-slate-500">Shared mock detection state</p>
          </div>
        </div>
        <Link
          className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
          to="/detections"
        >
          Detection history
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>

      {recentEvents.length > 0 ? (
        <div className="grid divide-y divide-slate-800/70 md:grid-cols-2 md:divide-y-0">
          {recentEvents.map((detection, index) => {
            const camera = resolveDetectionCamera(detection, cameras, areas)
            return (
              <article
                className={`flex items-start gap-3 px-5 py-3.5 ${index % 2 === 0 ? 'md:border-r md:border-slate-800/70' : ''} ${index >= 2 ? 'md:border-t md:border-slate-800/70' : ''}`}
                key={detection.id}
              >
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-cyan-400/10 font-mono text-[0.625rem] font-bold text-cyan-300">
                  {detection.trackingId}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-200">
                      {detection.id}
                    </span>
                    <span className="rounded border border-amber-400/20 bg-amber-400/10 px-1 py-0.5 font-mono text-[0.5rem] font-bold text-amber-300">
                      MOCK
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      {detectionObjectLabels[detection.objectClass]}{' '}
                      {formatDetectionConfidence(detection.confidence)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[0.6875rem] text-slate-500">
                    {camera.areaName} · {camera.location} · {detectionStatusLabels[detection.status]}
                  </p>
                  <p className="mt-1 text-[0.625rem] text-slate-600">
                    {formatDateTime(detection.timestamp)}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="grid min-h-40 place-items-center px-6 text-center">
          <div>
            <ScanSearch aria-hidden="true" className="mx-auto size-6 text-slate-700" />
            <p className="mt-2 text-xs text-slate-500">No simulated detection events.</p>
            <p className="mt-1 text-[0.625rem] text-slate-700">
              Start the simulation to generate shared mock events.
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}
