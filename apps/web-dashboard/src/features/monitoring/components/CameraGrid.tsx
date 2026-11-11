import { MonitorUp } from 'lucide-react'
import type { Area, Camera, Detection } from '../../../types'
import type { MonitoringLayout } from '../hooks/useMonitoring'
import { CameraPreview } from './CameraPreview'

interface CameraGridProps {
  areas: readonly Area[]
  cameras: readonly Camera[]
  currentTime: Date
  detections: readonly Detection[]
  layout: MonitoringLayout
}

const gridClasses: Record<MonitoringLayout, string> = {
  1: 'grid-cols-1 max-w-5xl',
  2: 'grid-cols-1 xl:grid-cols-2',
  4: 'grid-cols-1 xl:grid-cols-2',
}

export function CameraGrid({
  areas,
  cameras,
  currentTime,
  detections,
  layout,
}: CameraGridProps) {
  const slots = Array.from({ length: layout }, (_, index) => cameras[index])

  return (
    <div className={`mx-auto grid w-full gap-4 ${gridClasses[layout]}`}>
      {slots.map((camera, index) =>
        camera ? (
          <CameraPreview
            area={areas.find((area) => area.id === camera.areaId)}
            camera={camera}
            currentTime={currentTime}
            detections={detections}
            key={camera.id}
          />
        ) : (
          <div
            className="grid aspect-video place-items-center rounded-xl border border-dashed border-slate-700 bg-slate-950/25 text-center"
            key={`empty-slot-${index + 1}`}
          >
            <div>
              <MonitorUp aria-hidden="true" className="mx-auto size-6 text-slate-600" />
              <p className="mt-2 text-xs font-medium text-slate-500">Camera slot available</p>
              <p className="mt-1 text-[0.625rem] text-slate-700">Select a camera from the inventory</p>
            </div>
          </div>
        ),
      )}
    </div>
  )
}
