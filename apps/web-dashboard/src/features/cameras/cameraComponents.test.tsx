import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockAreas, mockCameras } from '../../mocks'
import { CameraFormDialog } from './components/CameraFormDialog'
import { CameraSummaryCards } from './components/CameraSummaryCards'
import { CameraTable } from './components/CameraTable'
import { DeleteCameraDialog } from './components/DeleteCameraDialog'
import { MonitoringConfirmationDialog } from './components/MonitoringConfirmationDialog'

describe('camera management components', () => {
  it('shows dynamic summary counts for the five initial cameras', () => {
    render(<CameraSummaryCards cameras={mockCameras} />)

    expect(screen.getByText('Total Cameras').previousElementSibling).toHaveTextContent(
      '5',
    )
    expect(screen.getByText('Online Cameras').previousElementSibling).toHaveTextContent(
      '4',
    )
    expect(screen.getByText('Offline Cameras').previousElementSibling).toHaveTextContent(
      '1',
    )
    expect(
      screen.getByText('Under Maintenance').previousElementSibling,
    ).toHaveTextContent('0')
    expect(
      screen.getByText('Monitoring Enabled').previousElementSibling,
    ).toHaveTextContent('5')
  })

  it('rejects an invalid IP address before adding a camera', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(async () => undefined)
    render(
      <CameraFormDialog
        areas={mockAreas}
        camera={null}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        open
      />,
    )
    const dialog = screen.getByRole('dialog')

    await user.type(within(dialog).getByLabelText(/Camera Name/), 'Test Camera')
    await user.type(within(dialog).getByLabelText(/Location/), 'Test Location')
    await user.type(within(dialog).getByLabelText(/Building/), 'Test Building')
    await user.type(within(dialog).getByLabelText(/IP Address/), '192.168.1.999')
    await user.click(within(dialog).getByRole('button', { name: 'Add Camera' }))

    expect(screen.getByText(/Enter a valid IPv4 address/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('prepopulates and submits edited camera details', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(async () => undefined)
    render(
      <CameraFormDialog
        areas={mockAreas}
        camera={mockCameras[0]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        open
      />,
    )
    const dialog = screen.getByRole('dialog')
    const nameInput = within(dialog).getByLabelText(/Camera Name/)

    expect(nameInput).toHaveValue('Public Market Entrance Camera')
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Public Market Camera')
    await user.selectOptions(
      within(dialog).getByLabelText('Connection Status'),
      'Maintenance',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Updated Public Market Camera',
        status: 'Maintenance',
      }),
    )
  })

  it('does not delete when the confirmation dialog is canceled', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onConfirm = vi.fn(async () => undefined)
    render(
      <DeleteCameraDialog
        camera={mockCameras[0]}
        onClose={onClose}
        onConfirm={onConfirm}
        open
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('deletes only after explicit confirmation', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn(async () => undefined)
    render(
      <DeleteCameraDialog
        camera={mockCameras[0]}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        open
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete Camera' }))

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(mockCameras[0]))
  })

  it('requests a monitoring change without changing offline status', async () => {
    const user = userEvent.setup()
    const offlineCamera = mockCameras[3]
    const onConfirm = vi.fn(async () => undefined)
    render(
      <MonitoringConfirmationDialog
        camera={offlineCamera}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        open
      />,
    )

    expect(screen.getByText(/will remain offline/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Disable Monitoring' }))

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(offlineCamera))
    expect(offlineCamera.status).toBe('Offline')
  })

  it('displays an empty search-results state with a reset action', () => {
    render(
      <CameraTable
        areas={mockAreas}
        cameras={[]}
        hasActiveFilters
        onClearFilters={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onToggleMonitoring={vi.fn()}
        onView={vi.fn()}
      />,
    )

    expect(screen.getByText('No cameras match these filters')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeEnabled()
  })
})
