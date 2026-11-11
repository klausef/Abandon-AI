import { Eye, SearchX } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import type { Area, Camera, Detection } from '../../../types'
import { formatDateTime } from '../../../utils/formatters'
import {
  detectionObjectLabels,
  detectionObjectToneClasses,
  formatDetectionConfidence,
  resolveDetectionCamera,
} from '../../../utils/detection'
import { DetectionStatusBadge } from './DetectionStatusBadge'

interface DetectionTableProps {
  areas: readonly Area[]
  cameras: readonly Camera[]
  detections: readonly Detection[]
  hasActiveFilters: boolean
  onClearFilters: () => void
  onView: (detection: Detection) => void
}

function ObjectBadge({ detection }: { detection: Detection }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[0.625rem] font-bold tracking-wide uppercase ${detectionObjectToneClasses[detection.objectClass]}`}
    >
      {detectionObjectLabels[detection.objectClass]}
    </span>
  )
}

export function DetectionTable({
  areas,
  cameras,
  detections,
  hasActiveFilters,
  onClearFilters,
  onView,
}: DetectionTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Detection records</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Simulated AI event history and tracking metadata
          </p>
        </div>
        <span className="rounded border border-amber-400/20 bg-amber-400/10 px-2 py-1 font-mono text-[0.625rem] font-bold tracking-[0.14em] text-amber-300">
          MOCK DATA
        </span>
      </div>

      {detections.length === 0 ? (
        <div className="grid min-h-72 place-items-center px-6 py-12 text-center">
          <div className="max-w-sm">
            <div className="mx-auto grid size-12 place-items-center rounded-xl border border-slate-700 bg-slate-800/60 text-slate-400">
              <SearchX aria-hidden="true" className="size-5" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-200">
              {hasActiveFilters
                ? 'No detections match these filters'
                : 'No simulated detections available'}
            </h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {hasActiveFilters
                ? 'Adjust the search criteria or reset the detection filters.'
                : 'Start the mock simulation from Live Monitoring to generate events.'}
            </p>
            {hasActiveFilters ? (
              <Button
                className="mt-5"
                onClick={onClearFilters}
                size="small"
                variant="secondary"
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[70rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/25">
                  {[
                    'Detection ID',
                    'Object Category',
                    'Camera',
                    'Area & Location',
                    'Tracking ID',
                    'Confidence',
                    'Timestamp',
                    'Detection Status',
                    'Actions',
                  ].map((heading) => (
                    <th
                      className="px-3 py-3 text-[0.625rem] font-bold tracking-[0.1em] text-slate-500 uppercase first:pl-6 last:pr-6"
                      key={heading}
                      scope="col"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {detections.map((detection) => {
                  const camera = resolveDetectionCamera(detection, cameras, areas)
                  return (
                    <tr
                      className="transition-colors hover:bg-slate-900/40"
                      key={detection.id}
                    >
                      <td className="px-3 py-4 pl-6">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-cyan-300">
                            {detection.id}
                          </span>
                          <span className="font-mono text-[0.5rem] font-bold text-amber-300">
                            MOCK
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <ObjectBadge detection={detection} />
                      </td>
                      <td className="max-w-44 px-3 py-4">
                        <p className="truncate text-xs font-semibold text-slate-300">
                          {camera.name}
                        </p>
                        <p className="mt-1 font-mono text-[0.625rem] text-slate-600">
                          {camera.id}
                          {camera.isRemoved ? ' · Removed' : ''}
                        </p>
                      </td>
                      <td className="max-w-40 px-3 py-4 text-xs text-slate-400">
                          <p className="truncate font-medium text-cyan-200">{camera.areaName}</p>
                          <p className="mt-1 truncate text-[0.625rem] text-slate-600">
                            {camera.location} · {camera.building}
                        </p>
                      </td>
                      <td className="px-3 py-4 font-mono text-xs font-bold text-violet-300">
                        {detection.trackingId}
                      </td>
                      <td className="px-3 py-4 text-xs font-semibold text-slate-300">
                        {formatDetectionConfidence(detection.confidence)}
                      </td>
                      <td className="px-3 py-4 text-[0.6875rem] whitespace-nowrap text-slate-500">
                        {formatDateTime(detection.timestamp)}
                      </td>
                      <td className="px-3 py-4">
                        <DetectionStatusBadge status={detection.status} />
                      </td>
                      <td className="px-3 py-4 pr-6">
                        <button
                          aria-label={`View details for ${detection.id}`}
                          className="grid size-8 place-items-center rounded-lg border border-transparent text-slate-500 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-cyan-300"
                          onClick={() => onView(detection)}
                          title="View detection details"
                          type="button"
                        >
                          <Eye aria-hidden="true" className="size-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-800/70 lg:hidden">
            {detections.map((detection) => {
              const camera = resolveDetectionCamera(detection, cameras, areas)
              return (
                <article className="p-4 sm:p-5" key={detection.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-300">
                          {detection.id}
                        </span>
                        <span className="font-mono text-[0.5rem] font-bold text-amber-300">
                          MOCK
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-slate-200">
                        {detectionObjectLabels[detection.objectClass]}
                      </p>
                    </div>
                    <DetectionStatusBadge status={detection.status} />
                  </div>

                  <div className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
                    <div>
                      <span className="block text-[0.625rem] text-slate-600">Camera</span>
                      {camera.name} · {camera.id}
                    </div>
                    <div>
                      <span className="block text-[0.625rem] text-slate-600">Location</span>
                      {camera.areaName} · {camera.location}
                    </div>
                    <div>
                      <span className="block text-[0.625rem] text-slate-600">Tracking</span>
                      ID {detection.trackingId} ·{' '}
                      {formatDetectionConfidence(detection.confidence)}
                    </div>
                    <div>
                      <span className="block text-[0.625rem] text-slate-600">Timestamp</span>
                      {formatDateTime(detection.timestamp)}
                    </div>
                  </div>

                  <Button
                    className="mt-4 w-full"
                    onClick={() => onView(detection)}
                    size="small"
                    variant="secondary"
                  >
                    <Eye aria-hidden="true" className="size-3.5" />
                    View Details
                  </Button>
                </article>
              )
            })}
          </div>
        </>
      )}
    </Card>
  )
}
