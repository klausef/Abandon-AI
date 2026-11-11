import { useCallback, useEffect, useState } from 'react'
import { cameraService } from '../services'
import type { Camera } from '../types'

interface CameraRecordsState {
  cameras: readonly Camera[]
  error: string | null
  isLoading: boolean
  reload: () => Promise<void>
}

export function useCameraRecords(): CameraRecordsState {
  const [cameras, setCameras] = useState<readonly Camera[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      setCameras(await cameraService.getCameras())
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Camera records could not be loaded.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isCancelled = false

    cameraService
      .getCameras()
      .then((loadedCameras) => {
        if (!isCancelled) {
          setCameras(loadedCameras)
          setIsLoading(false)
        }
      })
      .catch((loadError: unknown) => {
        if (!isCancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Camera records could not be loaded.',
          )
          setIsLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [])

  return { cameras, error, isLoading, reload }
}
