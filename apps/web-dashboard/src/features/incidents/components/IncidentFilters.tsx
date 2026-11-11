import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import type { IncidentPriority, IncidentStatus, SecurityOfficer } from '../../../types'
import {
  incidentPriorityLabels,
  incidentStatusLabels,
} from '../incidentPresentation'
import type { IncidentFilterState, IncidentSort } from '../incidentFilters'

interface IncidentFiltersProps {
  filters: IncidentFilterState
  hasActiveFilters: boolean
  officers: readonly SecurityOfficer[]
  onChange: (filters: IncidentFilterState) => void
  onClear: () => void
  resultCount: number
  totalCount: number
}

const controlClass =
  'h-10 w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 text-sm text-slate-200 outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10'
const statuses: readonly IncidentStatus[] = [
  'new',
  'acknowledged',
  'investigating',
  'resolved',
  'false_alarm',
]
const priorities: readonly IncidentPriority[] = ['low', 'normal', 'high', 'critical']

export function IncidentFilters({
  filters,
  hasActiveFilters,
  officers,
  onChange,
  onClear,
  resultCount,
  totalCount,
}: IncidentFiltersProps) {
  function update<Key extends keyof IncidentFilterState>(
    key: Key,
    value: IncidentFilterState[Key],
  ) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal aria-hidden="true" className="size-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">Search & filters</h2>
        </div>
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-slate-300">{resultCount}</span> of {totalCount}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(15rem,1.4fr)_repeat(5,minmax(8rem,0.75fr))_auto]">
        <label className="relative md:col-span-2 xl:col-span-1">
          <span className="sr-only">Search incidents</span>
          <Search aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
          <input
            className={`${controlClass} pl-9`}
            onChange={(event) => update('query', event.target.value)}
            placeholder="Search incident, camera, location, object"
            type="search"
            value={filters.query}
          />
        </label>
        <label>
          <span className="sr-only">Filter by incident status</span>
          <select className={controlClass} onChange={(event) => update('status', event.target.value as IncidentStatus | 'All')} value={filters.status}>
            <option value="All">All statuses</option>
            {statuses.map((status) => <option key={status} value={status}>{incidentStatusLabels[status]}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by priority</span>
          <select className={controlClass} onChange={(event) => update('priority', event.target.value as IncidentPriority | 'All')} value={filters.priority}>
            <option value="All">All priorities</option>
            {priorities.map((priority) => <option key={priority} value={priority}>{incidentPriorityLabels[priority]}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by assigned officer</span>
          <select className={controlClass} onChange={(event) => update('officerId', event.target.value)} value={filters.officerId}>
            <option value="All">All officers</option>
            <option value="Unassigned">Unassigned</option>
            {officers.map((officer) => <option key={officer.id} value={officer.id}>{officer.name}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter incidents by date</span>
          <input className={`${controlClass} [color-scheme:dark]`} onChange={(event) => update('date', event.target.value)} type="date" value={filters.date} />
        </label>
        <label>
          <span className="sr-only">Sort incidents</span>
          <select className={controlClass} onChange={(event) => update('sort', event.target.value as IncidentSort)} value={filters.sort}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority">Highest priority</option>
          </select>
        </label>
        <Button aria-label="Clear incident filters" disabled={!hasActiveFilters} onClick={onClear} size="icon" variant="secondary">
          <RotateCcw aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </Card>
  )
}
