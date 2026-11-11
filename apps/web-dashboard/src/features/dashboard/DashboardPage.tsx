import {
  Camera,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { MockDataBadge } from '../../components/ui/MockDataBadge'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatDateTime } from '../../utils/formatters'
import { CameraStatusOverview } from './components/CameraStatusOverview'
import { DashboardLoading } from './components/DashboardLoading'
import { MetricCard } from './components/MetricCard'
import { RecentIncidentAlerts } from './components/RecentIncidentAlerts'
import {
  buildIncidentActivity,
  calculateDashboardMetrics,
  getLatestCameraUpdate,
} from './dashboardData'
import { useDashboardData } from './useDashboardData'

const IncidentActivityChart = lazy(async () => {
  const chartModule = await import('./components/IncidentActivityChart')
  return { default: chartModule.IncidentActivityChart }
})

interface DashboardErrorProps {
  message: string
  onRetry: () => void
}

function DashboardError({ message, onRetry }: DashboardErrorProps) {
  return (
    <Card className="grid min-h-72 place-items-center p-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto grid size-12 place-items-center rounded-xl border border-rose-400/20 bg-rose-400/10 text-rose-300">
          <TriangleAlert aria-hidden="true" className="size-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-100">
          Dashboard data unavailable
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">{message}</p>
        <Button className="mt-5" onClick={onRetry} variant="secondary">
          <RefreshCw aria-hidden="true" className="size-4" />
          Retry mock providers
        </Button>
      </div>
    </Card>
  )
}

export function DashboardPage() {
  const { data, error, isLoading, retry } = useDashboardData()

  let dashboardContent

  if (isLoading) {
    dashboardContent = <DashboardLoading />
  } else if (error || !data) {
    dashboardContent = (
      <DashboardError
        message={error ?? 'No dashboard data was returned by the mock providers.'}
        onRetry={retry}
      />
    )
  } else {
    const metrics = calculateDashboardMetrics(data)
    const activity = buildIncidentActivity(data.incidents)
    const latestCameraUpdate = getLatestCameraUpdate(data.cameras)
    const cameraAvailability =
      metrics.totalCameras > 0
        ? Math.round((metrics.onlineCameras / metrics.totalCameras) * 100)
        : 0

    dashboardContent = (
      <div className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-30" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Mock providers synchronized
          </div>
          <p className="text-[0.6875rem] text-slate-600">
            {latestCameraUpdate
              ? `Latest simulated camera update: ${formatDateTime(latestCameraUpdate)}`
              : 'No simulated camera updates available'}
          </p>
        </div>

        <section aria-label="Public-space safety summary" className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-6">
          <MetricCard
            detail={`${metrics.monitoringEnabled} with monitoring enabled`}
            icon={Camera}
            label="Registered cameras"
            tone="cyan"
            value={metrics.totalCameras}
          />
          <MetricCard
            detail={`${cameraAvailability}% fleet availability`}
            icon={Wifi}
            label="Online cameras"
            tone="green"
            value={metrics.onlineCameras}
          />
          <MetricCard
            detail={
              metrics.offlineCameras > 0
                ? 'Requires operator attention'
                : 'All cameras available'
            }
            icon={WifiOff}
            label="Offline cameras"
            tone={metrics.offlineCameras > 0 ? 'red' : 'slate'}
            value={metrics.offlineCameras}
          />
          <MetricCard
            detail={`${metrics.trackingDetections} currently tracking`}
            icon={ScanSearch}
            label="Total detections"
            tone="violet"
            value={metrics.totalDetections}
          />
          <MetricCard
            detail={`${metrics.newIncidents} new · ${metrics.investigatingIncidents} investigating`}
            icon={ShieldAlert}
            label="Active incidents"
            tone="amber"
            value={metrics.activeIncidents}
          />
          <MetricCard
            detail="Closed after security review"
            icon={ShieldCheck}
            label="Resolved incidents"
            tone="green"
            value={metrics.resolvedIncidents}
          />
        </section>

        <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(22rem,0.85fr)]">
          <Suspense
            fallback={
              <Card
                aria-label="Loading incident activity chart"
                className="h-[26rem] animate-pulse"
              />
            }
          >
            <IncidentActivityChart data={activity} />
          </Suspense>
          <CameraStatusOverview cameras={data.cameras} />
        </div>

        <RecentIncidentAlerts
          cameras={data.cameras}
          incidents={data.incidents}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              dot
              tone={error ? 'red' : isLoading ? 'amber' : 'green'}
            >
              {error
                ? 'Provider error'
                : isLoading
                  ? 'Loading dashboard'
                  : 'Dashboard ready'}
            </StatusBadge>
            <MockDataBadge />
          </div>
        }
        description="Monitor simulated public-space camera availability, detection volume, and unattended-object incident activity from one operational view."
        eyebrow="Command overview"
        title="Security Operations Overview"
      />
      {dashboardContent}
    </div>
  )
}
