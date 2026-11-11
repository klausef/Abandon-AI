import { ArrowUpRight, Camera, MapPin, Wifi, WifiOff, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { Camera as CameraRecord } from '../../../types'
import { formatDateTime } from '../../../utils/formatters'

interface CameraStatusOverviewProps {
  cameras: readonly CameraRecord[]
}

export function CameraStatusOverview({
  cameras,
}: CameraStatusOverviewProps) {
  const onlineCount = cameras.filter((camera) => camera.status === 'Online').length
  const availability = cameras.length > 0 ? (onlineCount / cameras.length) * 100 : 0

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg border border-violet-400/15 bg-violet-400/10 text-violet-300">
            <Camera aria-hidden="true" className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Camera status</h2>
            <p className="mt-0.5 text-xs text-slate-500">Mock camera inventory</p>
          </div>
        </div>
        <StatusBadge dot tone={onlineCount === cameras.length ? 'green' : 'amber'}>
          {onlineCount}/{cameras.length} online
        </StatusBadge>
      </div>

      <div className="border-b border-slate-800/60 px-5 py-4">
        <div className="mb-2 flex items-center justify-between text-[0.6875rem]">
          <span className="text-slate-500">Fleet availability</span>
          <span className="font-semibold text-slate-300">{Math.round(availability)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            aria-label={`${Math.round(availability)} percent of cameras online`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(availability)}
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400"
            role="progressbar"
            style={{ width: `${availability}%` }}
          />
        </div>
      </div>

      <div className="flex-1 divide-y divide-slate-800/60 px-5">
        {cameras.length > 0 ? (
          cameras.map((camera) => {
            const isOnline = camera.status === 'Online'
            const isMaintenance = camera.status === 'Maintenance'

            return (
              <div className="flex items-center gap-3 py-3" key={camera.id}>
                <div
                  className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                    isOnline
                      ? 'bg-emerald-400/10 text-emerald-300'
                      : isMaintenance
                        ? 'bg-amber-400/10 text-amber-300'
                        : 'bg-rose-400/10 text-rose-300'
                  }`}
                >
                  {isOnline ? (
                    <Wifi aria-hidden="true" className="size-3.5" />
                  ) : isMaintenance ? (
                    <Wrench aria-hidden="true" className="size-3.5" />
                  ) : (
                    <WifiOff aria-hidden="true" className="size-3.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-semibold text-slate-200">
                      {camera.name}
                    </p>
                    <span className="font-mono text-[0.5625rem] font-bold tracking-wider text-amber-400/80">
                      {camera.source}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1 truncate text-[0.625rem] text-slate-500">
                    <MapPin aria-hidden="true" className="size-2.5 shrink-0" />
                    {camera.status === 'Offline'
                      ? `Last seen ${formatDateTime(camera.lastConnection)}`
                      : camera.location}
                  </p>
                </div>
                <span
                  className={`size-2 shrink-0 rounded-full ${
                    isOnline
                      ? 'bg-emerald-400'
                      : isMaintenance
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                  }`}
                  title={camera.status}
                />
              </div>
            )
          })
        ) : (
          <div className="grid min-h-48 place-items-center text-sm text-slate-500">
            No mock cameras are registered.
          </div>
        )}
      </div>

      <Link
        className="flex items-center justify-center gap-2 border-t border-slate-800/80 px-5 py-3.5 text-xs font-semibold text-cyan-400 transition-colors hover:bg-cyan-400/5 hover:text-cyan-300"
        to="/cameras"
      >
        View camera management
        <ArrowUpRight aria-hidden="true" className="size-3.5" />
      </Link>
    </Card>
  )
}
