import { Grid2X2, LayoutPanelTop, Pause, Play, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { MonitoringLayout } from '../hooks/useMonitoring'

interface MonitoringControlsProps {
  eligibleCameraCount: number
  eventCount: number
  isRunning: boolean
  layout: MonitoringLayout
  onClear: () => void
  onLayoutChange: (layout: MonitoringLayout) => void
  onPause: () => void
  onStart: () => void
}

const layouts: readonly MonitoringLayout[] = [1, 2, 4]

export function MonitoringControls({
  eligibleCameraCount,
  eventCount,
  isRunning,
  layout,
  onClear,
  onLayoutChange,
  onPause,
  onStart,
}: MonitoringControlsProps) {
  return (
    <Card className="flex flex-col gap-4 p-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge dot tone={isRunning ? 'green' : 'amber'}>
          {isRunning ? 'Mock simulation running' : 'Mock simulation paused'}
        </StatusBadge>
        <span className="text-xs text-slate-500">
          {eligibleCameraCount} eligible camera{eligibleCameraCount === 1 ? '' : 's'} ·{' '}
          {eventCount} shared event{eventCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          aria-label="Camera grid layout"
          className="flex items-center rounded-lg border border-slate-700 bg-slate-950/40 p-1"
          role="group"
        >
          {layouts.map((layoutOption) => (
            <button
              aria-label={`${layoutOption} camera layout`}
              aria-pressed={layout === layoutOption}
              className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors ${
                layout === layoutOption
                  ? 'bg-cyan-400/15 text-cyan-300'
                  : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
              }`}
              key={layoutOption}
              onClick={() => onLayoutChange(layoutOption)}
              type="button"
            >
              {layoutOption === 4 ? (
                <Grid2X2 aria-hidden="true" className="size-3.5" />
              ) : (
                <LayoutPanelTop aria-hidden="true" className="size-3.5" />
              )}
              {layoutOption}
            </button>
          ))}
        </div>

        <Button
          disabled={isRunning || eligibleCameraCount === 0}
          onClick={onStart}
          size="small"
        >
          <Play aria-hidden="true" className="size-3.5" />
          Start Simulation
        </Button>
        <Button
          disabled={!isRunning}
          onClick={onPause}
          size="small"
          variant="secondary"
        >
          <Pause aria-hidden="true" className="size-3.5" />
          Pause Simulation
        </Button>
        <Button
          disabled={eventCount === 0}
          onClick={onClear}
          size="small"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" className="size-3.5" />
          Clear Events
        </Button>
      </div>
    </Card>
  )
}
