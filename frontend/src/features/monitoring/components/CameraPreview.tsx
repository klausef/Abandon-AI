import { Camera as CameraIcon, Pause, Radio, WifiOff, Wrench } from 'lucide-react'
import type { Area, Camera, Detection } from '../../../types'
import { DetectionBoundingBox } from './DetectionBoundingBox'

interface CameraPreviewProps {
  area: Area | undefined
  camera: Camera
  currentTime: Date
  detections: readonly Detection[]
}

function formatFeedTime(value: Date): string {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(value)
}

export function CameraPreview({
  area,
  camera,
  currentTime,
  detections,
}: CameraPreviewProps) {
  const isOnline = camera.status === 'Online'
  const isActive = isOnline && camera.monitoringEnabled
  const cameraDetections = isActive
    ? detections.filter((detection) => detection.cameraId === camera.id).slice(0, 4)
    : []

  return (
    <article className="overflow-hidden rounded-xl border border-slate-700/90 bg-[#03080d] shadow-[0_16px_40px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-700/80 bg-command-900 px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-xs font-semibold text-slate-100">{camera.name}</h3>
            <span className="font-mono text-[0.5625rem] font-bold text-cyan-300">
              {camera.id}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[0.625rem] text-slate-500">
            {area?.name ?? `Unknown area (${camera.areaId})`} · {camera.location}
          </p>
        </div>
        <span
          className={`size-2 shrink-0 rounded-full ${
            isActive
              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
              : camera.status === 'Maintenance'
                ? 'bg-amber-400'
                : 'bg-rose-400'
          }`}
          title={isActive ? 'Mock monitoring active' : camera.status}
        />
      </div>

      <div className="relative aspect-video overflow-hidden bg-[radial-gradient(circle_at_50%_20%,#142b3c_0%,#07111b_55%,#020609_100%)]">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] [background-size:8%_12%]"
        />
        <div aria-hidden="true" className="absolute right-[8%] bottom-[12%] h-[52%] w-[32%] border border-slate-500/10 bg-slate-500/5 [clip-path:polygon(12%_18%,85%_0,100%_100%,0_100%)]" />
        <div aria-hidden="true" className="absolute bottom-[12%] left-[7%] h-[38%] w-[38%] border border-cyan-300/8 bg-cyan-300/3 [clip-path:polygon(0_28%,80%_0,100%_100%,8%_100%)]" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[18%] border-t border-slate-400/10 bg-slate-950/30" />

        <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2">
          <span className="rounded border border-amber-400/20 bg-slate-950/70 px-1.5 py-1 font-mono text-[0.5rem] font-bold tracking-wider text-amber-300 backdrop-blur-sm">
            MOCK PREVIEW · NO CAMERA CONNECTED
          </span>
          {isActive ? (
            <span className="flex items-center gap-1.5 rounded bg-slate-950/70 px-1.5 py-1 font-mono text-[0.5rem] font-bold text-rose-300 backdrop-blur-sm">
              <span className="size-1.5 animate-pulse rounded-full bg-rose-400" />
              SIMULATION ON
            </span>
          ) : null}
        </div>

        <div className="absolute top-3 right-3 z-20 rounded bg-slate-950/70 px-2 py-1 font-mono text-[0.5625rem] text-slate-300 backdrop-blur-sm">
          {formatFeedTime(currentTime)}
        </div>

        {cameraDetections.map((detection) => (
          <DetectionBoundingBox detection={detection} key={detection.id} />
        ))}

        {!isOnline ? (
          <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/85 text-center backdrop-blur-[2px]">
            <div>
              <div className={`mx-auto grid size-12 place-items-center rounded-xl border ${camera.status === 'Maintenance' ? 'border-amber-400/20 bg-amber-400/10 text-amber-300' : 'border-rose-400/20 bg-rose-400/10 text-rose-300'}`}>
                {camera.status === 'Maintenance' ? (
                  <Wrench aria-hidden="true" className="size-5" />
                ) : (
                  <WifiOff aria-hidden="true" className="size-5" />
                )}
              </div>
              <p className="mt-3 text-xs font-bold tracking-[0.14em] text-slate-200 uppercase">
                {camera.status === 'Maintenance' ? 'Under Maintenance' : 'Camera Offline'}
              </p>
              <p className="mt-1 text-[0.625rem] text-slate-600">No active detections displayed</p>
            </div>
          </div>
        ) : !camera.monitoringEnabled ? (
          <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/75 text-center backdrop-blur-[1px]">
            <div>
              <div className="mx-auto grid size-12 place-items-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
                <Pause aria-hidden="true" className="size-5" />
              </div>
              <p className="mt-3 text-xs font-bold tracking-[0.14em] text-slate-200 uppercase">
                Monitoring Paused
              </p>
              <p className="mt-1 text-[0.625rem] text-slate-600">Mock preview available · detections hidden</p>
            </div>
          </div>
        ) : cameraDetections.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center opacity-35">
              <Radio aria-hidden="true" className="mx-auto size-6 text-cyan-300" />
              <p className="mt-2 font-mono text-[0.5625rem] tracking-widest text-cyan-200">
                MOCK MONITORING ACTIVE
              </p>
            </div>
          </div>
        ) : null}

        <div className="absolute right-3 bottom-3 z-20 flex items-center gap-1.5 rounded bg-slate-950/70 px-2 py-1 font-mono text-[0.5rem] text-slate-400 backdrop-blur-sm">
          <CameraIcon aria-hidden="true" className="size-2.5" />
          {camera.id} · {camera.location}
        </div>
      </div>
    </article>
  )
}
