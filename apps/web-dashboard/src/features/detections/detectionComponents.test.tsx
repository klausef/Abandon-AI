import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockAreas, mockCameras, mockDetections } from '../../mocks'
import { DetectionDetails } from './components/DetectionDetails'
import { DetectionSummaryCards } from './components/DetectionSummaryCards'

describe('Detection History components', () => {
  it('derives summary values from shared mock detections', () => {
    render(<DetectionSummaryCards detections={mockDetections} />)

    expect(screen.getByText('Total Detections').previousElementSibling).toHaveTextContent(
      '4',
    )
    expect(screen.getByText('People Detected').previousElementSibling).toHaveTextContent(
      '1',
    )
    expect(
      screen.getByText('Abandoned-Object Categories Detected').previousElementSibling,
    ).toHaveTextContent('3')
    expect(screen.getByText('Active Tracking IDs').previousElementSibling).toHaveTextContent(
      '4',
    )
  })

  it('shows complete detection details and evidence metadata', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const detection = mockDetections[0]
    render(
      <DetectionDetails
        areas={mockAreas}
        cameras={mockCameras}
        detection={detection}
        onClose={onClose}
      />,
    )

    expect(screen.getAllByText(detection.id).length).toBeGreaterThan(0)
    expect(screen.getByText('Backpack')).toBeInTheDocument()
    expect(screen.getByText('91%')).toBeInTheDocument()
    expect(screen.getByText(/x 0.38, y 0.55, w 0.18, h 0.28/)).toBeInTheDocument()
    expect(screen.getByText(/SIMULATED EVIDENCE PREVIEW/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close Details' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('uses preserved camera metadata after camera deletion', () => {
    const detection = mockDetections[0]
    const camerasWithoutSource = mockCameras.filter(
      (camera) => camera.id !== detection.cameraId,
    )
    render(
      <DetectionDetails
        areas={mockAreas}
        cameras={camerasWithoutSource}
        detection={detection}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText(/This camera is no longer in the active inventory/)).toBeInTheDocument()
    expect(screen.getByText(/Transport Terminal Waiting Area Camera/)).toBeInTheDocument()
  })
})
