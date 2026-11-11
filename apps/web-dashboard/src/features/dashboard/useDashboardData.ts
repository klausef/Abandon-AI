import { useEffect, useState } from 'react'
import {
  MockCameraProvider,
  MockDetectionProvider,
  MockIncidentService,
} from '../../services'
import type { DashboardData } from './dashboardData'

const cameraProvider = new MockCameraProvider()
const detectionProvider = new MockDetectionProvider()
const incidentService = new MockIncidentService()

interface DashboardDataState {
  data: DashboardData | null
  error: string | null
  isLoading: boolean
  retry: () => void
}

export function useDashboardData(): DashboardDataState {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isCancelled = false

    async function loadDashboardData() {
      setIsLoading(true)
      setError(null)

      try {
        const [cameras, detections, incidents] = await Promise.all([
          cameraProvider.listCameras(),
          detectionProvider.listDetections(),
          incidentService.listIncidents(),
        ])

        if (!isCancelled) {
          setData({ cameras, detections, incidents })
        }
      } catch (loadError) {
        if (!isCancelled) {
          const message =
            loadError instanceof Error
              ? loadError.message
              : 'The mock dashboard data could not be loaded.'
          setError(message)
          setData(null)
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadDashboardData()

    return () => {
      isCancelled = true
    }
  }, [reloadKey])

  return {
    data,
    error,
    isLoading,
    retry: () => setReloadKey((currentKey) => currentKey + 1),
  }
}
