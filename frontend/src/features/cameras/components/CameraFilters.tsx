import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import type { Area, CameraStatus, CameraType } from '../../../types'
import {
  cameraStatusOptions,
  cameraTypeOptions,
} from '../cameraForm'
import type { CameraFilterState, CameraSort } from '../cameraFilters'

interface CameraFiltersProps {
  areas: readonly Area[]
  filters: CameraFilterState
  hasActiveFilters: boolean
  onChange: (filters: CameraFilterState) => void
  onClear: () => void
  resultCount: number
  totalCount: number
}

const inputClassName =
  'h-10 w-full rounded-lg border border-slate-700/90 bg-slate-950/50 px-3 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10'

export function CameraFilters({
  areas,
  filters,
  hasActiveFilters,
  onChange,
  onClear,
  resultCount,
  totalCount,
}: CameraFiltersProps) {
  function updateFilter<Key extends keyof CameraFilterState>(
    key: Key,
    value: CameraFilterState[Key],
  ) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal aria-hidden="true" className="size-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">Search & filters</h2>
        </div>
        <p className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-300">{resultCount}</span> of{' '}
          {totalCount} mock cameras
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1.5fr)_repeat(4,minmax(9rem,0.75fr))_auto]">
        <label className="relative md:col-span-2 xl:col-span-1">
          <span className="sr-only">Search cameras</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500"
          />
          <input
            className={`${inputClassName} pl-9`}
            onChange={(event) => updateFilter('query', event.target.value)}
            placeholder="Search camera, area, city, or location"
            type="search"
            value={filters.query}
          />
        </label>

        <label>
          <span className="sr-only">Filter by connection status</span>
          <select
            className={inputClassName}
            onChange={(event) =>
              updateFilter('status', event.target.value as CameraStatus | 'All')
            }
            value={filters.status}
          >
            <option value="All">All statuses</option>
            {cameraStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Filter by area</span>
          <select
            className={inputClassName}
            onChange={(event) => updateFilter('areaId', event.target.value)}
            value={filters.areaId}
          >
            <option value="All">All areas</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Filter by camera type</span>
          <select
            className={inputClassName}
            onChange={(event) =>
              updateFilter('cameraType', event.target.value as CameraType | 'All')
            }
            value={filters.cameraType}
          >
            <option value="All">All camera types</option>
            {cameraTypeOptions.map((cameraType) => (
              <option key={cameraType} value={cameraType}>
                {cameraType}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Sort cameras</span>
          <select
            className={inputClassName}
            onChange={(event) =>
              updateFilter('sort', event.target.value as CameraSort)
            }
            value={filters.sort}
          >
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="status">Connection status</option>
          </select>
        </label>

        <Button
          aria-label="Clear camera filters"
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
