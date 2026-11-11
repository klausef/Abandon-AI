import { useSyncExternalStore } from 'react'
import { areaService } from '../services'
import type { Area } from '../types'

export function useAreaRecords(): readonly Area[] {
  return useSyncExternalStore(
    areaService.subscribe,
    areaService.getSnapshot,
    areaService.getSnapshot,
  )
}
