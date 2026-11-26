import { RefreshCw, TriangleAlert, VideoOff } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { MockDataBadge } from '../../components/ui/MockDataBadge'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAreaRecords } from '../../hooks/useAreaRecords'
import { CameraGrid } from './components/CameraGrid'
import { CameraSelector } from './components/CameraSelector'
import { MonitoringControls } from './components/MonitoringControls'
import { RecentDetectionEvents } from './components/RecentDetectionEvents'
import { useMonitoring } from './hooks/useMonitoring'

function MonitoringLoading() {
  return (
    <div aria-label="Loading simulated monitoring workspace" className="space-y-5" role="status">
      <span className="sr-only">Loading monitoring workspace</span>
      <div className="h-20 animate-pulse rounded-2xl border border-slate-800 bg-command-900/70" />
      <div className="grid gap-5 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <div className="h-[32rem] animate-pulse rounded-2xl border border-slate-800 bg-command-900/70" />
        <div className="grid gap-4 xl:grid-cols-2">
          {[1, 2, 3, 4].map((slot) => (
            <div
              className="aspect-video animate-pulse rounded-xl border border-slate-800 bg-command-900/70"
              key={slot}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function MonitoringPage() {
  const monitoring = useMonitoring()
  const areas = useAreaRecords()

  return (
    <div className="space-y-6">
      <PageHeader
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              dot
              tone={monitoring.isSimulationRunning ? 'green' : 'amber'}
            >
              {monitoring.isSimulationRunning
                ? 'Mock preview running'
                : 'Mock preview paused'}
            </StatusBadge>
            <MockDataBadge />
          </div>
        }
        description="Monitor public-space camera placeholders and review simulated object detection events."
        eyebrow="Security operations"
        title="Live Monitoring"
      />

      <Card
        className="flex flex-col gap-3 border-amber-400/20 bg-amber-400/5 p-4 sm:flex-row sm:items-center sm:justify-between"
        role="status"
        surface="subtle"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-amber-400/20 bg-amber-400/10 text-amber-300">
            <VideoOff aria-hidden="true" className="size-4" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.12em] text-amber-200 uppercase">
              Mock preview — no camera connected
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Tapo C200C RTSP is not configured. These are placeholders and simulated events;
              no frames are sent to Roboflow and no processor detections are sent to Convex.
            </p>
          </div>
        </div>
        <code className="self-start rounded border border-slate-700 bg-slate-950/60 px-2 py-1 font-mono text-[0.625rem] text-slate-400 sm:self-auto">
          PROCESSOR_SOURCE_MODE=disabled
        </code>
      </Card>

      {monitoring.isLoading ? (
        <MonitoringLoading />
      ) : monitoring.error ? (
        <Card className="grid min-h-64 place-items-center p-6 text-center">
          <div className="max-w-md">
            <div className="mx-auto grid size-12 place-items-center rounded-xl border border-rose-400/20 bg-rose-400/10 text-rose-300">
              <TriangleAlert aria-hidden="true" className="size-5" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-100">
              Camera inventory unavailable
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {monitoring.error}
            </p>
            <Button
              className="mt-5"
              onClick={() => void monitoring.reload()}
              variant="secondary"
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Retry camera service
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          <MonitoringControls
            eligibleCameraCount={monitoring.eligibleCameraCount}
            eventCount={monitoring.detections.length}
            isRunning={monitoring.isSimulationRunning}
            layout={monitoring.layout}
            onClear={monitoring.clearEvents}
            onLayoutChange={monitoring.setLayout}
            onPause={monitoring.pauseSimulation}
            onStart={monitoring.startSimulation}
          />

          <div className="grid items-start gap-5 xl:grid-cols-[19rem_minmax(0,1fr)]">
            <div className="xl:sticky xl:top-[5.75rem]">
              <CameraSelector
                areas={areas}
                cameras={monitoring.cameras}
                maxSelection={monitoring.layout}
                onToggle={monitoring.toggleCamera}
                selectedCameraIds={monitoring.selectedCameraIds}
              />
            </div>
            <CameraGrid
              areas={areas}
              cameras={monitoring.selectedCameras}
              currentTime={monitoring.currentTime}
              detections={monitoring.detections}
              layout={monitoring.layout}
            />
          </div>

          <RecentDetectionEvents
            areas={areas}
            cameras={monitoring.cameras}
            detections={monitoring.detections}
          />
        </div>
      )}
    </div>
  )
}
