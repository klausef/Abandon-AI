import { useCallback, useEffect, useRef, useState } from 'react'
import { useCameraRecords } from '../../../hooks/useCameraRecords'
import { cameraService, detectionService } from '../../../services'
import type { Camera } from '../../../types'
import { useDetections } from '../../detections/hooks/useDetections'

export type MonitoringLayout = 1 | 2 | 4
export const SIMULATION_INTERVAL_MS = 6_000

export function useMonitoring() {
  const cameraRecords = useCameraRecords()
  const { clearEvents, detections } = useDetections()
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [isSimulationRunning, setIsSimulationRunning] = useState(false)
  const [layout, setLayoutState] = useState<MonitoringLayout>(4)
  const [selectedIdsState, setSelectedIdsState] = useState<readonly string[] | null>(
    null,
  )
  const simulationTimer = useRef<number | null>(null)

  const defaultSelectedIds = cameraRecords.cameras
    .slice(0, layout)
    .map((camera) => camera.id)
  const selectedCameraIds = selectedIdsState ?? defaultSelectedIds

  useEffect(() => {
    const clockTimer = window.setInterval(() => setCurrentTime(new Date()), 1_000)
    return () => window.clearInterval(clockTimer)
  }, [])

  const generateEvent = useCallback(async () => {
    const currentCameras = await cameraService.getCameras()
    detectionService.generateDetection(currentCameras)
  }, [])

  const pauseSimulation = useCallback(() => {
    if (simulationTimer.current !== null) {
      window.clearInterval(simulationTimer.current)
      simulationTimer.current = null
    }
    setIsSimulationRunning(false)
  }, [])

  useEffect(
    () => () => {
      if (simulationTimer.current !== null) {
        window.clearInterval(simulationTimer.current)
      }
    },
    [],
  )

  const startSimulation = useCallback(() => {
    if (simulationTimer.current !== null) {
      return
    }

    setIsSimulationRunning(true)
    void generateEvent()
    simulationTimer.current = window.setInterval(
      () => void generateEvent(),
      SIMULATION_INTERVAL_MS,
    )
  }, [generateEvent])

  function setLayout(nextLayout: MonitoringLayout) {
    setLayoutState(nextLayout)
    setSelectedIdsState((currentSelection) => {
      const selection = currentSelection ?? defaultSelectedIds
      const trimmedSelection = selection.slice(0, nextLayout)
      const availableIds = cameraRecords.cameras
        .map((camera) => camera.id)
        .filter((cameraId) => !trimmedSelection.includes(cameraId))

      return [
        ...trimmedSelection,
        ...availableIds.slice(0, nextLayout - trimmedSelection.length),
      ]
    })
  }

  function toggleCamera(cameraId: string) {
    setSelectedIdsState((currentSelection) => {
      const selection = currentSelection ?? defaultSelectedIds

      if (selection.includes(cameraId)) {
        return selection.filter((selectedId) => selectedId !== cameraId)
      }

      if (selection.length >= layout) {
        return selection
      }

      return [...selection, cameraId]
    })
  }

  const selectedCameras = selectedCameraIds
    .map((cameraId) =>
      cameraRecords.cameras.find((camera) => camera.id === cameraId),
    )
    .filter((camera): camera is Camera => Boolean(camera))
  const eligibleCameraCount = cameraRecords.cameras.filter(
    (camera) => camera.status === 'Online' && camera.monitoringEnabled,
  ).length

  return {
    ...cameraRecords,
    clearEvents,
    currentTime,
    detections,
    eligibleCameraCount,
    isSimulationRunning,
    layout,
    pauseSimulation,
    selectedCameraIds,
    selectedCameras,
    setLayout,
    startSimulation,
    toggleCamera,
  }
}
