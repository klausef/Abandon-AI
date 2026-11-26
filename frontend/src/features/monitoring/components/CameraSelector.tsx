import { Building2, Check, Video } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card } from '../../../components/ui/Card'
import type { Area, Camera, CameraStatus } from '../../../types'
import { getAreaName } from '../../../utils/area'
import { CameraConnectionStatusBadge } from '../../cameras/components/CameraStatusBadge'
import { getMonitoringState } from '../../cameras/cameraMonitoring'

interface CameraSelectorProps {
  areas: readonly Area[]
  cameras: readonly Camera[]
  maxSelection: number
  onToggle: (cameraId: string) => void
  selectedCameraIds: readonly string[]
}

const selectClassName =
  'h-9 min-w-0 rounded-lg border border-slate-700 bg-slate-950/50 px-2.5 text-xs text-slate-300 outline-none focus:border-cyan-400/60'

export function CameraSelector({
  areas,
  cameras,
  maxSelection,
  onToggle,
  selectedCameraIds,
}: CameraSelectorProps) {
  const [areaId, setAreaId] = useState('All')
  const [status, setStatus] = useState<CameraStatus | 'All'>('All')
  const assignedAreas = useMemo(
    () => areas.filter((area) => cameras.some((camera) => camera.areaId === area.id)),
    [areas, cameras],
  )
  const visibleCameras = cameras.filter(
    (camera) =>
      (areaId === 'All' || camera.areaId === areaId) &&
      (status === 'All' || camera.status === status),
  )

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-800 px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Video aria-hidden="true" className="size-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">Camera selection</h2>
          </div>
          <span className="font-mono text-[0.625rem] font-bold text-cyan-300">
            {selectedCameraIds.length}/{maxSelection}
          </span>
        </div>
        <p className="mt-1 text-[0.6875rem] text-slate-500">
          Choose cameras for the active grid.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-slate-800/70 p-3">
        <label>
          <span className="sr-only">Filter monitoring cameras by area</span>
          <select
            className={`${selectClassName} w-full`}
            onChange={(event) => setAreaId(event.target.value)}
            value={areaId}
          >
            <option value="All">All areas</option>
            {assignedAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter monitoring cameras by status</span>
          <select
            className={`${selectClassName} w-full`}
            onChange={(event) =>
              setStatus(event.target.value as CameraStatus | 'All')
            }
            value={status}
          >
            <option value="All">All statuses</option>
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </label>
      </div>

      <div className="max-h-[34rem] space-y-1 overflow-y-auto p-2">
        {visibleCameras.length > 0 ? (
          visibleCameras.map((camera) => {
            const isSelected = selectedCameraIds.includes(camera.id)
            const selectionIsFull =
              selectedCameraIds.length >= maxSelection && !isSelected

            return (
              <button
                aria-pressed={isSelected}
                className={`flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors ${
                  isSelected
                    ? 'border-cyan-400/25 bg-cyan-400/8'
                    : 'border-transparent hover:border-slate-700 hover:bg-slate-900/70'
                } disabled:cursor-not-allowed disabled:opacity-40`}
                disabled={selectionIsFull}
                key={camera.id}
                onClick={() => onToggle(camera.id)}
                type="button"
              >
                <span
                  className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded border ${
                    isSelected
                      ? 'border-cyan-300 bg-cyan-400 text-slate-950'
                      : 'border-slate-600 bg-slate-800 text-transparent'
                  }`}
                >
                  <Check aria-hidden="true" className="size-3" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-xs font-semibold text-slate-200">
                      {camera.name}
                    </span>
                    <span className="font-mono text-[0.5rem] font-bold text-amber-300">
                      MOCK
                    </span>
                  </span>
                  <span className="mt-1 flex items-center gap-1 truncate text-[0.625rem] text-slate-600">
                    <Building2 aria-hidden="true" className="size-2.5 shrink-0" />
                    {getAreaName(areas, camera.areaId)} · {camera.location}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-1.5">
                    <CameraConnectionStatusBadge status={camera.status} />
                    <span className="text-[0.5625rem] text-slate-600">
                      {getMonitoringState(camera)}
                    </span>
                  </span>
                </span>
              </button>
            )
          })
        ) : (
          <div className="grid min-h-40 place-items-center px-4 text-center text-xs text-slate-500">
            No cameras match these filters.
          </div>
        )}
      </div>
    </Card>
  )
}
