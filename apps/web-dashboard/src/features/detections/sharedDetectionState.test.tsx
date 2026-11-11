import { act, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockCameras } from '../../mocks'
import { detectionService } from '../../services'
import { useDetections } from './hooks/useDetections'
import { SIMULATION_INTERVAL_MS, useMonitoring } from '../monitoring/hooks/useMonitoring'

function DetectionConsumer({ name }: { name: string }) {
  const { detections } = useDetections()
  return <span>{name}: {detections.length}</span>
}

describe('shared detection state', () => {
  it('updates all subscribers when an event is generated or cleared', () => {
    render(
      <>
        <DetectionConsumer name="monitoring" />
        <DetectionConsumer name="history" />
      </>,
    )

    expect(screen.getByText('monitoring: 4')).toBeInTheDocument()
    expect(screen.getByText('history: 4')).toBeInTheDocument()

    act(() => {
      detectionService.generateDetection(mockCameras)
    })
    expect(screen.getByText('monitoring: 5')).toBeInTheDocument()
    expect(screen.getByText('history: 5')).toBeInTheDocument()

    act(() => {
      detectionService.clearEvents()
    })
    expect(screen.getByText('monitoring: 0')).toBeInTheDocument()
    expect(screen.getByText('history: 0')).toBeInTheDocument()
  })
})

describe('monitoring simulation timer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts, emits controlled events, pauses, and cleans up on unmount', async () => {
    const { result, unmount } = renderHook(() => useMonitoring())
    const initialCount = result.current.detections.length

    await act(async () => {
      result.current.startSimulation()
      await Promise.resolve()
    })
    expect(result.current.isSimulationRunning).toBe(true)
    expect(result.current.detections).toHaveLength(initialCount + 1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SIMULATION_INTERVAL_MS)
    })
    expect(result.current.detections).toHaveLength(initialCount + 2)

    act(() => result.current.pauseSimulation())
    const pausedCount = result.current.detections.length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SIMULATION_INTERVAL_MS * 2)
    })
    expect(result.current.isSimulationRunning).toBe(false)
    expect(result.current.detections).toHaveLength(pausedCount)

    unmount()
    await vi.advanceTimersByTimeAsync(SIMULATION_INTERVAL_MS)
    expect(detectionService.getSnapshot()).toHaveLength(pausedCount)
  })
})
