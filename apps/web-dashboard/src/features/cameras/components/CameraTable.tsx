import {
  Edit3,
  Eye,
  MapPin,
  SearchX,
  Trash2,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import type { Area, Camera } from '../../../types'
import { getAreaName } from '../../../utils/area'
import { getMonitoringState } from '../cameraMonitoring'
import { CameraConnectionStatusBadge } from './CameraStatusBadge'
import { MonitoringToggle } from './MonitoringToggle'

interface CameraTableProps {
  areas: readonly Area[]
  cameras: readonly Camera[]
  hasActiveFilters: boolean
  onClearFilters: () => void
  onDelete: (camera: Camera) => void
  onEdit: (camera: Camera) => void
  onToggleMonitoring: (camera: Camera) => void
  onView: (camera: Camera) => void
  readOnly?: boolean
}

interface ActionButtonProps {
  children: ReactNode
  label: string
  onClick: () => void
  tone?: 'default' | 'danger'
}

function ActionButton({
  children,
  label,
  onClick,
  tone = 'default',
}: ActionButtonProps) {
  return (
    <button
      aria-label={label}
      className={`grid size-8 place-items-center rounded-lg border transition-colors ${
        tone === 'danger'
          ? 'border-transparent text-slate-500 hover:border-rose-400/20 hover:bg-rose-400/10 hover:text-rose-300'
          : 'border-transparent text-slate-500 hover:border-slate-700 hover:bg-slate-800 hover:text-cyan-300'
      }`}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  )
}

function CameraActions({
  camera,
  onDelete,
  onEdit,
  onView,
  readOnly = false,
}: {
  camera: Camera
  onDelete: (camera: Camera) => void
  onEdit: (camera: Camera) => void
  onView: (camera: Camera) => void
  readOnly?: boolean
}) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <ActionButton label={`View details for ${camera.name}`} onClick={() => onView(camera)}>
        <Eye aria-hidden="true" className="size-4" />
      </ActionButton>
      {!readOnly ? <ActionButton label={`Edit ${camera.name}`} onClick={() => onEdit(camera)}>
        <Edit3 aria-hidden="true" className="size-4" />
      </ActionButton> : null}
      {!readOnly ? <ActionButton
        label={`Delete ${camera.name}`}
        onClick={() => onDelete(camera)}
        tone="danger"
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </ActionButton> : null}
    </div>
  )
}

function EmptyCameraResults({
  hasActiveFilters,
  onClearFilters,
}: Pick<CameraTableProps, 'hasActiveFilters' | 'onClearFilters'>) {
  return (
    <div className="grid min-h-72 place-items-center px-6 py-12 text-center">
      <div className="max-w-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-xl border border-slate-700 bg-slate-800/60 text-slate-400">
          <SearchX aria-hidden="true" className="size-5" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-slate-200">
          {hasActiveFilters ? 'No cameras match these filters' : 'No cameras registered'}
        </h3>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {hasActiveFilters
            ? 'Try a different search term or reset the current camera filters.'
            : 'Use Add Camera to register a simulated public-space camera.'}
        </p>
        {hasActiveFilters ? (
          <Button className="mt-5" onClick={onClearFilters} size="small" variant="secondary">
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function CameraTable({
  areas,
  cameras,
  hasActiveFilters,
  onClearFilters,
  onDelete,
  onEdit,
  onToggleMonitoring,
  onView,
  readOnly = false,
}: CameraTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Registered Cameras</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Simulated public-space camera inventory
          </p>
        </div>
        <span className="rounded border border-amber-400/20 bg-amber-400/10 px-2 py-1 font-mono text-[0.625rem] font-bold tracking-[0.14em] text-amber-300">
          MOCK DATA
        </span>
      </div>

      {cameras.length === 0 ? (
        <EmptyCameraResults
          hasActiveFilters={hasActiveFilters}
          onClearFilters={onClearFilters}
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[68rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/25">
                  {[
                    'Camera ID',
                    'Camera Name',
                    'Area',
                    'Location',
                    'Camera Type',
                    'IP Address',
                    'Connection Status',
                    'Monitoring',
                    'Actions',
                  ].map((heading) => (
                    <th
                      className="px-4 py-3 text-[0.625rem] font-bold tracking-[0.12em] text-slate-500 uppercase first:pl-6 last:pr-6"
                      key={heading}
                      scope="col"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {cameras.map((camera) => (
                  <tr className="transition-colors hover:bg-slate-900/40" key={camera.id}>
                    <td className="px-4 py-4 pl-6">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-300">
                          {camera.id}
                        </span>
                        <span className="font-mono text-[0.5rem] font-bold tracking-wider text-amber-300">
                          MOCK
                        </span>
                      </div>
                    </td>
                    <td className="max-w-52 px-4 py-4">
                      <p className="truncate text-xs font-semibold text-slate-200">
                        {camera.name}
                      </p>
                      <p className="mt-1 text-[0.625rem] text-slate-600">
                        {camera.resolution}
                      </p>
                    </td>
                    <td className="max-w-52 px-4 py-4">
                      <p className="truncate text-xs font-medium text-cyan-200">
                        {getAreaName(areas, camera.areaId)}
                      </p>
                      <p className="mt-1 font-mono text-[0.625rem] text-slate-600">
                        {camera.areaId}
                      </p>
                    </td>
                    <td className="max-w-52 px-4 py-4">
                      <p className="truncate text-xs text-slate-300">{camera.location}</p>
                      <p className="mt-1 truncate text-[0.625rem] text-slate-600">
                        {camera.building} · {camera.floor || 'Floor not specified'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-400">{camera.cameraType}</td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-400">
                      {camera.ipAddress || 'Not assigned'}
                    </td>
                    <td className="px-4 py-4">
                      <CameraConnectionStatusBadge status={camera.status} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        {!readOnly ? <MonitoringToggle
                          cameraId={camera.id}
                          cameraName={camera.name}
                          enabled={camera.monitoringEnabled}
                          onToggleRequested={() => onToggleMonitoring(camera)}
                        /> : null}
                        <span className="max-w-24 text-[0.625rem] leading-4 text-slate-500">
                          {getMonitoringState(camera)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 pr-6">
                      <CameraActions
                        camera={camera}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        onView={onView}
                        readOnly={readOnly}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-800/70 lg:hidden">
            {cameras.map((camera) => (
              <article className="p-4 sm:p-5" key={camera.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-300">
                        {camera.id}
                      </span>
                      <span className="font-mono text-[0.5rem] font-bold tracking-wider text-amber-300">
                        MOCK
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[0.6875rem] font-medium text-cyan-200">
                      {getAreaName(areas, camera.areaId)}
                    </p>
                    <h3 className="mt-1.5 truncate text-sm font-semibold text-slate-100">
                      {camera.name}
                    </h3>
                  </div>
                  <CameraConnectionStatusBadge status={camera.status} />
                </div>

                <div className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
                  <p className="flex items-start gap-2">
                    <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-slate-600" />
                    <span>
                      {camera.location}
                      <span className="mt-0.5 block text-[0.625rem] text-slate-600">
                        {camera.areaId} · {camera.building} · {camera.floor || 'Floor not specified'}
                      </span>
                    </span>
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[0.625rem] text-slate-600">Type</span>
                      {camera.cameraType}
                    </div>
                    <div>
                      <span className="block text-[0.625rem] text-slate-600">IP Address</span>
                      <span className="font-mono">{camera.ipAddress || 'Not assigned'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/70 pt-3">
                  <div className="flex items-center gap-2.5">
                    {!readOnly ? <MonitoringToggle
                      cameraId={camera.id}
                      cameraName={camera.name}
                      enabled={camera.monitoringEnabled}
                      onToggleRequested={() => onToggleMonitoring(camera)}
                    /> : null}
                    <span className="text-[0.6875rem] text-slate-500">
                      {getMonitoringState(camera)}
                    </span>
                  </div>
                  <CameraActions
                    camera={camera}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onView={onView}
                    readOnly={readOnly}
                  />
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
