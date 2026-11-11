import { Camera as CameraIcon, CheckCircle2, MapPinned, Plus, RefreshCw, TriangleAlert, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { MockDataBadge } from '../../components/ui/MockDataBadge'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAreaRecords } from '../../hooks/useAreaRecords'
import { areaService } from '../../services'
import type { Camera } from '../../types'
import type { Area } from '../../types'
import type { AreaFormValues } from '../areas/areaForm'
import { AreaFormDialog } from '../areas/components/AreaFormDialog'
import { AreaTable } from '../areas/components/AreaTable'
import { DeleteAreaDialog } from '../areas/components/DeleteAreaDialog'
import {
  filterAndSortCameras,
  hasActiveCameraFilters,
  defaultCameraFilters,
  type CameraFilterState,
} from './cameraFilters'
import {
  toCreateCameraInput,
  toUpdateCameraInput,
  type CameraFormValues,
} from './cameraForm'
import { CameraDetails } from './components/CameraDetails'
import { CameraFilters } from './components/CameraFilters'
import { CameraFormDialog } from './components/CameraFormDialog'
import { CameraSummaryCards } from './components/CameraSummaryCards'
import { CameraTable } from './components/CameraTable'
import { DeleteCameraDialog } from './components/DeleteCameraDialog'
import { MonitoringConfirmationDialog } from './components/MonitoringConfirmationDialog'
import { useCameras } from './hooks/useCameras'
import { useMockAuth } from '../users/auth/useMockAuth'

interface FeedbackMessage {
  message: string
  title: string
}

type InventoryTab = 'cameras' | 'areas'

function CameraPageLoading() {
  return (
    <div aria-label="Loading mock cameras" className="space-y-5" role="status">
      <span className="sr-only">Loading cameras</span>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {['total', 'online', 'offline', 'maintenance', 'monitoring'].map((item) => (
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

export function CamerasPage() {
  const { can } = useMockAuth()
  const canManage = can('cameras:manage')
  const canManageAreas = can('areas:manage')
  const canViewAreas = can('areas:view')
  const areas = useAreaRecords()
  const {
    cameras,
    createCamera,
    deleteCamera,
    error,
    isLoading,
    reload,
    toggleMonitoring,
    updateCamera,
  } = useCameras()
  const [deleteTarget, setDeleteTarget] = useState<Camera | null>(null)
  const [deleteAreaTarget, setDeleteAreaTarget] = useState<Area | null>(null)
  const [detailsTarget, setDetailsTarget] = useState<Camera | null>(null)
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null)
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null)
  const [filters, setFilters] = useState<CameraFilterState>(defaultCameraFilters)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isAreaFormOpen, setIsAreaFormOpen] = useState(false)
  const [monitoringTarget, setMonitoringTarget] = useState<Camera | null>(null)
  const [activeTab, setActiveTab] = useState<InventoryTab>('cameras')

  const filteredCameras = useMemo(
    () => filterAndSortCameras(cameras, filters, areas),
    [areas, cameras, filters],
  )
  const filtersAreActive = hasActiveCameraFilters(filters)

  function openAddCamera() {
    setEditingCamera(null)
    setIsFormOpen(true)
  }

  function openEditCamera(camera: Camera) {
    setDetailsTarget(null)
    setEditingCamera(camera)
    setIsFormOpen(true)
  }

  function openAddArea() {
    setEditingArea(null)
    setIsAreaFormOpen(true)
  }

  function openEditArea(area: Area) {
    setEditingArea(area)
    setIsAreaFormOpen(true)
  }

  async function handleCameraSubmit(values: CameraFormValues) {
    if (editingCamera) {
      const updatedCamera = await updateCamera(
        editingCamera.id,
        toUpdateCameraInput(values),
      )
      setFeedback({
        title: 'Camera updated',
        message: `${updatedCamera.name} (${updatedCamera.id}) was updated successfully.`,
      })
    } else {
      const createdCamera = await createCamera(toCreateCameraInput(values))
      setFilters(defaultCameraFilters)
      setFeedback({
        title: 'Camera added',
        message: `${createdCamera.name} was registered as ${createdCamera.id} with an Offline status.`,
      })
    }

    setIsFormOpen(false)
    setEditingCamera(null)
  }

  async function handleDelete(camera: Camera) {
    const wasDeleted = await deleteCamera(camera.id)

    if (!wasDeleted) {
      throw new Error(`Camera ${camera.id} could not be found.`)
    }

    setDeleteTarget(null)
    setDetailsTarget((current) => (current?.id === camera.id ? null : current))
    setFeedback({
      title: 'Camera deleted',
      message: `${camera.name} (${camera.id}) was removed from the mock inventory.`,
    })
  }

  async function handleAreaSubmit(values: AreaFormValues) {
    if (editingArea) {
      const updatedArea = await areaService.updateArea(editingArea.id, values)
      setFeedback({
        title: 'Area updated',
        message: `${updatedArea.name} (${updatedArea.id}) was updated successfully. Assigned camera IDs were preserved.`,
      })
    } else {
      const createdArea = await areaService.createArea(values)
      setFeedback({
        title: 'Area added',
        message: `${createdArea.name} was registered as ${createdArea.id}.`,
      })
    }
    setIsAreaFormOpen(false)
    setEditingArea(null)
  }

  async function handleDeleteArea(area: Area) {
    const wasDeleted = await areaService.deleteArea(area.id, cameras)
    if (!wasDeleted) throw new Error(`Area ${area.id} could not be found.`)
    setDeleteAreaTarget(null)
    setFeedback({
      title: 'Area deleted',
      message: `${area.name} (${area.id}) was removed from the mock area catalog.`,
    })
  }

  async function handleToggleMonitoring(camera: Camera) {
    const updatedCamera = await toggleMonitoring(camera.id)
    setMonitoringTarget(null)
    setFeedback({
      title: updatedCamera.monitoringEnabled
        ? 'Monitoring enabled'
        : 'Monitoring disabled',
      message: `${updatedCamera.name} remains ${updatedCamera.status}; only its monitoring preference changed.`,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        action={
          <div className="flex flex-wrap items-center gap-2">
            <MockDataBadge />
            {activeTab === 'cameras' && canManage ? (
              <Button onClick={openAddCamera}>
                <Plus aria-hidden="true" className="size-4" />
                Add Camera
              </Button>
            ) : null}
            {activeTab === 'areas' && canManageAreas ? (
              <Button onClick={openAddArea}>
                <Plus aria-hidden="true" className="size-4" />
                Add Area
              </Button>
            ) : null}
          </div>
        }
        description="Identify public-space cameras by reusable demo area and exact coverage location."
        eyebrow="Camera and area inventory"
        title="Camera & Area Management"
      />

      <div className="inline-flex rounded-xl border border-slate-800 bg-command-900/80 p-1" role="tablist" aria-label="Camera management views">
        <button
          aria-selected={activeTab === 'cameras'}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${activeTab === 'cameras' ? 'bg-cyan-400/10 text-cyan-200' : 'text-slate-500 hover:text-slate-200'}`}
          onClick={() => setActiveTab('cameras')}
          role="tab"
          type="button"
        >
          <CameraIcon aria-hidden="true" className="size-3.5" /> Cameras
        </button>
        {canViewAreas ? (
          <button
            aria-selected={activeTab === 'areas'}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${activeTab === 'areas' ? 'bg-cyan-400/10 text-cyan-200' : 'text-slate-500 hover:text-slate-200'}`}
            onClick={() => setActiveTab('areas')}
            role="tab"
            type="button"
          >
            <MapPinned aria-hidden="true" className="size-3.5" /> Areas
          </button>
        ) : null}
      </div>

      {feedback ? (
        <div
          className="flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-3 text-emerald-100"
          role="status"
        >
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-300" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">{feedback.title}</p>
            <p className="mt-1 text-xs leading-5 text-emerald-200/70">{feedback.message}</p>
          </div>
          <button
            aria-label="Dismiss success message"
            className="text-emerald-300/60 transition-colors hover:text-emerald-200"
            onClick={() => setFeedback(null)}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : null}

      {activeTab === 'cameras' && isLoading ? (
        <CameraPageLoading />
      ) : error ? (
        <Card className="grid min-h-64 place-items-center p-6 text-center">
          <div className="max-w-md">
            <div className="mx-auto grid size-12 place-items-center rounded-xl border border-rose-400/20 bg-rose-400/10 text-rose-300">
              <TriangleAlert aria-hidden="true" className="size-5" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-100">
              Camera inventory unavailable
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{error}</p>
            <Button className="mt-5" onClick={() => void reload()} variant="secondary">
              <RefreshCw aria-hidden="true" className="size-4" />
              Retry mock service
            </Button>
          </div>
        </Card>
      ) : activeTab === 'cameras' ? (
        <div className="space-y-5">
          <CameraSummaryCards cameras={cameras} />
          <CameraFilters
            areas={areas}
            filters={filters}
            hasActiveFilters={filtersAreActive}
            onChange={setFilters}
            onClear={() => setFilters(defaultCameraFilters)}
            resultCount={filteredCameras.length}
            totalCount={cameras.length}
          />
          <CameraTable
            areas={areas}
            cameras={filteredCameras}
            hasActiveFilters={filtersAreActive}
            onClearFilters={() => setFilters(defaultCameraFilters)}
            onDelete={setDeleteTarget}
            onEdit={openEditCamera}
            onToggleMonitoring={setMonitoringTarget}
            onView={setDetailsTarget}
            readOnly={!canManage}
          />
        </div>
      ) : (
        <AreaTable
          areas={areas}
          cameras={cameras}
          canManage={canManageAreas}
          onDelete={setDeleteAreaTarget}
          onEdit={openEditArea}
        />
      )}

      {isFormOpen ? (
        <CameraFormDialog
          areas={areas}
          camera={editingCamera}
          onClose={() => {
            setIsFormOpen(false)
            setEditingCamera(null)
          }}
          onSubmit={handleCameraSubmit}
          open
        />
      ) : null}
      {detailsTarget ? (
        <CameraDetails
          areas={areas}
          camera={detailsTarget}
          canEdit={canManage}
          onClose={() => setDetailsTarget(null)}
          onEdit={openEditCamera}
          open
        />
      ) : null}
      {deleteTarget ? (
        <DeleteCameraDialog
          camera={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          open
        />
      ) : null}
      {monitoringTarget ? (
        <MonitoringConfirmationDialog
          camera={monitoringTarget}
          onClose={() => setMonitoringTarget(null)}
          onConfirm={handleToggleMonitoring}
          open
        />
      ) : null}
      {isAreaFormOpen ? (
        <AreaFormDialog
          area={editingArea}
          onClose={() => {
            setIsAreaFormOpen(false)
            setEditingArea(null)
          }}
          onSubmit={handleAreaSubmit}
          open
        />
      ) : null}
      {deleteAreaTarget ? (
        <DeleteAreaDialog
          area={deleteAreaTarget}
          assignedCameraCount={cameras.filter((camera) => camera.areaId === deleteAreaTarget.id).length}
          onClose={() => setDeleteAreaTarget(null)}
          onConfirm={handleDeleteArea}
          open
        />
      ) : null}
    </div>
  )
}
