import { useCallback, useEffect, useState } from 'react'
import { cameraService } from '../../../services'
import type {
  Camera,
  CreateCameraInput,
  UpdateCameraInput,
} from '../../../types'

interface UseCamerasResult {
  cameras: readonly Camera[]
  createCamera: (input: CreateCameraInput) => Promise<Camera>
  deleteCamera: (cameraId: string) => Promise<boolean>
  error: string | null
  isLoading: boolean
  reload: () => Promise<void>
  toggleMonitoring: (cameraId: string) => Promise<Camera>
  updateCamera: (cameraId: string, input: UpdateCameraInput) => Promise<Camera>
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The mock camera operation could not be completed.'
}

export function useCameras(): UseCamerasResult {
  const [cameras, setCameras] = useState<readonly Camera[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      setCameras(await cameraService.getCameras())
    } catch (loadError) {
      setError(getErrorMessage(loadError))
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
          setError(getErrorMessage(loadError))
          setIsLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [])

  const createCamera = useCallback(async (input: CreateCameraInput) => {
    try {
      const createdCamera = await cameraService.createCamera(input)
      setCameras(await cameraService.getCameras())
      setError(null)
      return createdCamera
    } catch (operationError) {
      const message = getErrorMessage(operationError)
      throw new Error(message)
    }
  }, [])

  const updateCamera = useCallback(
    async (cameraId: string, input: UpdateCameraInput) => {
      try {
        const updatedCamera = await cameraService.updateCamera(cameraId, input)
        setCameras(await cameraService.getCameras())
        setError(null)
        return updatedCamera
      } catch (operationError) {
        const message = getErrorMessage(operationError)
        throw new Error(message)
      }
    },
    [],
  )

  const deleteCamera = useCallback(async (cameraId: string) => {
    try {
      const wasDeleted = await cameraService.deleteCamera(cameraId)
      setCameras(await cameraService.getCameras())
      setError(null)
      return wasDeleted
    } catch (operationError) {
      const message = getErrorMessage(operationError)
      throw new Error(message)
    }
  }, [])

  const toggleMonitoring = useCallback(async (cameraId: string) => {
    try {
      const updatedCamera = await cameraService.toggleMonitoring(cameraId)
      setCameras(await cameraService.getCameras())
      setError(null)
      return updatedCamera
    } catch (operationError) {
      const message = getErrorMessage(operationError)
      throw new Error(message)
    }
  }, [])

  return {
    cameras,
    createCamera,
    deleteCamera,
    error,
    isLoading,
    reload,
    toggleMonitoring,
    updateCamera,
  }
}
