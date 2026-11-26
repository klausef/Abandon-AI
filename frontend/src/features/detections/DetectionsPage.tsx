import { RefreshCw, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { MockDataBadge } from '../../components/ui/MockDataBadge'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useCameraRecords } from '../../hooks/useCameraRecords'
import { useAreaRecords } from '../../hooks/useAreaRecords'
import type { Detection } from '../../types'
import {
  defaultDetectionFilters,
  filterAndSortDetections,
  hasActiveDetectionFilters,
  type DetectionFilterState,
} from './detectionFilters'
import { DetectionDetails } from './components/DetectionDetails'
import { DetectionFilters } from './components/DetectionFilters'
import { DetectionSummaryCards } from './components/DetectionSummaryCards'
import { DetectionTable } from './components/DetectionTable'
import { useDetections } from './hooks/useDetections'

function DetectionPageLoading() {
  return (
    <div aria-label="Loading detection history" className="space-y-5" role="status">
      <span className="sr-only">Loading detection history</span>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            className="h-24 animate-pulse rounded-2xl border border-slate-800 bg-command-900/70"
            key={item}
          />
        ))}
      </div>
      <div className="h-36 animate-pulse rounded-2xl border border-slate-800 bg-command-900/70" />
      <div className="h-96 animate-pulse rounded-2xl border border-slate-800 bg-command-900/70" />
    </div>
  )
}

export function DetectionsPage() {
  const areas = useAreaRecords()
  const { cameras, error, isLoading, reload } = useCameraRecords()
  const { detections } = useDetections()
  const [detailsTarget, setDetailsTarget] = useState<Detection | null>(null)
  const [filters, setFilters] = useState<DetectionFilterState>(
    defaultDetectionFilters,
  )
  const filteredDetections = useMemo(
    () => filterAndSortDetections(detections, cameras, filters, areas),
    [areas, cameras, detections, filters],
  )
  const filtersAreActive = hasActiveDetectionFilters(filters)

  return (
    <div className="space-y-6">
      <PageHeader
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge dot tone="cyan">
              {detections.length} shared events
            </StatusBadge>
            <MockDataBadge />
          </div>
        }
        description="Review simulated object classifications, tracking IDs, confidence scores, and camera evidence."
        eyebrow="Detection records"
        title="Detection History"
      />

      {isLoading ? (
        <DetectionPageLoading />
      ) : error ? (
        <Card className="grid min-h-64 place-items-center p-6 text-center">
          <div className="max-w-md">
            <div className="mx-auto grid size-12 place-items-center rounded-xl border border-rose-400/20 bg-rose-400/10 text-rose-300">
              <TriangleAlert aria-hidden="true" className="size-5" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-100">
              Camera references unavailable
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{error}</p>
            <Button
              className="mt-5"
              onClick={() => void reload()}
              variant="secondary"
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Retry camera service
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          <DetectionSummaryCards detections={detections} />
          <DetectionFilters
            cameras={cameras}
            detections={detections}
            filters={filters}
            hasActiveFilters={filtersAreActive}
            onChange={setFilters}
            onClear={() => setFilters(defaultDetectionFilters)}
            resultCount={filteredDetections.length}
          />
          <DetectionTable
            areas={areas}
            cameras={cameras}
            detections={filteredDetections}
            hasActiveFilters={filtersAreActive}
            onClearFilters={() => setFilters(defaultDetectionFilters)}
            onView={setDetailsTarget}
          />
        </div>
      )}

      {detailsTarget ? (
        <DetectionDetails
          areas={areas}
          cameras={cameras}
          detection={detailsTarget}
          onClose={() => setDetailsTarget(null)}
        />
      ) : null}
    </div>
  )
}
