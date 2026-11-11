import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockAreas, mockCameras, mockDetections } from '../../mocks'
import { CameraPreview } from './components/CameraPreview'
import { CameraSelector } from './components/CameraSelector'
import { MonitoringControls } from './components/MonitoringControls'

const previewTime = new Date('2026-11-09T10:30:00.000Z')

describe('Live Monitoring components', () => {
  it('shows every Phase 3 camera in the selector', () => {
    render(
      <CameraSelector
        areas={mockAreas}
        cameras={mockCameras}
        maxSelection={4}
        onToggle={vi.fn()}
        selectedCameraIds={mockCameras.slice(0, 4).map((camera) => camera.id)}
      />,
    )

    mockCameras.forEach((camera) => {
      expect(screen.getByText(camera.name)).toBeInTheDocument()
    })
  })

  it('displays camera metadata and normalized percentage overlays', () => {
    const camera = mockCameras[0]
    const detection = mockDetections.find((item) => item.cameraId === camera.id)!
    render(
      <CameraPreview
        area={mockAreas.find((area) => area.id === camera.areaId)}
        camera={camera}
        currentTime={previewTime}
        detections={[detection]}
      />,
    )

    expect(screen.getByText(camera.name)).toBeInTheDocument()
    expect(
      screen.getAllByText(/MOCK PREVIEW · NO CAMERA CONNECTED/).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('SIMULATION ON')).toBeInTheDocument()
    const boundingBox = screen.getByTestId(`bounding-box-${detection.id}`)
    expect(boundingBox).toHaveStyle({
      left: `${detection.boundingBox.x * 100}%`,
      top: `${detection.boundingBox.y * 100}%`,
      width: `${detection.boundingBox.width * 100}%`,
      height: `${detection.boundingBox.height * 100}%`,
    })
  })

  it('shows an offline placeholder and suppresses detections', () => {
    const offlineCamera = mockCameras[3]
    const simulatedDetection = {
      ...mockDetections[0],
      id: 'DET-OFFLINE',
      cameraId: offlineCamera.id,
    }
    render(
      <CameraPreview
        area={mockAreas.find((area) => area.id === offlineCamera.areaId)}
        camera={offlineCamera}
        currentTime={previewTime}
        detections={[simulatedDetection]}
      />,
    )

    expect(screen.getByText('Camera Offline')).toBeInTheDocument()
    expect(screen.queryByTestId('bounding-box-DET-OFFLINE')).not.toBeInTheDocument()
  })

  it('shows monitoring paused and suppresses detections', () => {
    const pausedCamera = { ...mockCameras[0], monitoringEnabled: false }
    const detection = mockDetections.find(
      (item) => item.cameraId === pausedCamera.id,
    )!
    render(
      <CameraPreview
        area={mockAreas.find((area) => area.id === pausedCamera.areaId)}
        camera={pausedCamera}
        currentTime={previewTime}
        detections={[detection]}
      />,
    )

    expect(screen.getByText('Monitoring Paused')).toBeInTheDocument()
    expect(screen.queryByTestId(`bounding-box-${detection.id}`)).not.toBeInTheDocument()
  })

  it('provides functional start, pause, clear, and layout controls', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    const onPause = vi.fn()
    const onClear = vi.fn()
    const onLayoutChange = vi.fn()
    const { rerender } = render(
      <MonitoringControls
        eligibleCameraCount={4}
        eventCount={4}
        isRunning={false}
        layout={4}
        onClear={onClear}
        onLayoutChange={onLayoutChange}
        onPause={onPause}
        onStart={onStart}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Start Simulation' }))
    await user.click(screen.getByRole('button', { name: 'Clear Events' }))
    await user.click(screen.getByRole('button', { name: '2 camera layout' }))
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(onLayoutChange).toHaveBeenCalledWith(2)

    rerender(
      <MonitoringControls
        eligibleCameraCount={4}
        eventCount={4}
        isRunning
        layout={4}
        onClear={onClear}
        onLayoutChange={onLayoutChange}
        onPause={onPause}
        onStart={onStart}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Pause Simulation' }))
    expect(onPause).toHaveBeenCalledTimes(1)
  })
})
