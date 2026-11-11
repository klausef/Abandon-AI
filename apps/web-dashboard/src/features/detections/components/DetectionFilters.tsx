import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import type {
  Camera,
  Detection,
  DetectionObjectClass,
  DetectionStatus,
} from '../../../types'
import {
  detectionObjectClasses,
  detectionObjectLabels,
  detectionStatusLabels,
  resolveDetectionCamera,
} from '../../../utils/detection'
import type {
  DetectionFilterState,
  DetectionSort,
} from '../detectionFilters'

interface DetectionFiltersProps {
  cameras: readonly Camera[]
  detections: readonly Detection[]
  filters: DetectionFilterState
  hasActiveFilters: boolean
  onChange: (filters: DetectionFilterState) => void
  onClear: () => void
  resultCount: number
}

const inputClassName =
  'h-10 w-full rounded-lg border border-slate-700/90 bg-slate-950/50 px-3 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10'

const detectionStatuses: readonly DetectionStatus[] = [
  'detected',
  'tracking',
  'stationary',
  'unattended_monitoring',
  'potential_incident',
]

export function DetectionFilters({
  cameras,
  detections,
  filters,
  hasActiveFilters,
  onChange,
  onClear,
  resultCount,
}: DetectionFiltersProps) {
  function updateFilter<Key extends keyof DetectionFilterState>(
    key: Key,
    value: DetectionFilterState[Key],
  ) {
    onChange({ ...filters, [key]: value })
  }

  const cameraOptions = new Map<string, string>()
  detections.forEach((detection) => {
    const camera = resolveDetectionCamera(detection, cameras)
    cameraOptions.set(camera.id, `${camera.name} (${camera.id})`)
  })
  cameras.forEach((camera) =>
    cameraOptions.set(camera.id, `${camera.name} (${camera.id})`),
  )

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal aria-hidden="true" className="size-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">Search & filters</h2>
        </div>
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-slate-300">{resultCount}</span> of{' '}
          {detections.length} mock detections
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(15rem,1.4fr)_repeat(5,minmax(8rem,0.75fr))_auto]">
        <label className="relative md:col-span-2 xl:col-span-1">
          <span className="sr-only">Search detection history</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500"
          />
          <input
            className={`${inputClassName} pl-9`}
            onChange={(event) => updateFilter('query', event.target.value)}
            placeholder="Search detection, object, camera, or area"
            type="search"
            value={filters.query}
          />
        </label>

        <label>
          <span className="sr-only">Filter by object category</span>
          <select
            className={inputClassName}
            onChange={(event) =>
              updateFilter(
                'objectClass',
                event.target.value as DetectionObjectClass | 'All',
              )
            }
            value={filters.objectClass}
          >
            <option value="All">All objects</option>
            {detectionObjectClasses.map((objectClass) => (
              <option key={objectClass} value={objectClass}>
                {detectionObjectLabels[objectClass]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Filter by camera</span>
          <select
            className={inputClassName}
            onChange={(event) => updateFilter('cameraId', event.target.value)}
            value={filters.cameraId}
          >
            <option value="All">All cameras</option>
            {[...cameraOptions.entries()]
              .sort((first, second) => first[1].localeCompare(second[1]))
              .map(([cameraId, label]) => (
                <option key={cameraId} value={cameraId}>
                  {label}
                </option>
              ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Filter by detection status</span>
          <select
            className={inputClassName}
            onChange={(event) =>
              updateFilter(
                'status',
                event.target.value as DetectionStatus | 'All',
              )
            }
            value={filters.status}
          >
            <option value="All">All statuses</option>
            {detectionStatuses.map((status) => (
              <option key={status} value={status}>
                {detectionStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Filter by date</span>
          <input
            className={`${inputClassName} [color-scheme:dark]`}
            onChange={(event) => updateFilter('date', event.target.value)}
            type="date"
            value={filters.date}
          />
        </label>

        <label>
          <span className="sr-only">Sort detections</span>
          <select
            className={inputClassName}
            onChange={(event) =>
              updateFilter('sort', event.target.value as DetectionSort)
            }
            value={filters.sort}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>

        <Button
          aria-label="Clear detection filters"
          disabled={!hasActiveFilters}
          onClick={onClear}
          size="icon"
          variant="secondary"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </Card>
  )
}
