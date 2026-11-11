import { useSyncExternalStore } from 'react'
import { detectionService } from '../../../services'
import type { Detection } from '../../../types'

interface UseDetectionsResult {
  clearEvents: () => void
  detections: readonly Detection[]
}

export function useDetections(): UseDetectionsResult {
  const detections = useSyncExternalStore(
    detectionService.subscribe,
    detectionService.getSnapshot,
    detectionService.getSnapshot,
  )

  return {
    clearEvents: () => detectionService.clearEvents(),
    detections,
  }
}
