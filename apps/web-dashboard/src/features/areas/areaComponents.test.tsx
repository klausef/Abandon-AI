import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockAreas, mockCameras } from '../../mocks'
import { AreaFormDialog } from './components/AreaFormDialog'
import { AreaTable } from './components/AreaTable'
import { DeleteAreaDialog } from './components/DeleteAreaDialog'

describe('area management components', () => {
  it('validates required fields and submits normalized values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(async () => undefined)
    render(<AreaFormDialog area={null} onClose={vi.fn()} onSubmit={onSubmit} open />)
    const dialog = screen.getByRole('dialog')

    await user.clear(within(dialog).getByLabelText(/City \/ Municipality/))
    await user.click(within(dialog).getByRole('button', { name: 'Add Area' }))
    expect(screen.getByText('Area name is required.')).toBeInTheDocument()
    expect(screen.getByText('City or municipality is required.')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText(/Area Name/), '  Community Park  ')
    await user.type(within(dialog).getByLabelText(/City \/ Municipality/), 'Valencia City')
    await user.click(within(dialog).getByRole('button', { name: 'Add Area' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Community Park',
        city: 'Valencia City',
        province: 'Bukidnon',
      }),
    )
  })

  it('shows assignment counts and management actions', () => {
    render(
      <AreaTable
        areas={mockAreas}
        cameras={mockCameras}
        canManage
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />,
    )
    expect(screen.getAllByText('Valencia Public Market').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1 camera').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Edit Valencia Public Market' })).toBeInTheDocument()
  })

  it('explains why an assigned area cannot be deleted', () => {
    render(
      <DeleteAreaDialog
        area={mockAreas[0]}
        assignedCameraCount={1}
        onClose={vi.fn()}
        onConfirm={vi.fn(async () => undefined)}
        open
      />,
    )
    expect(screen.getByText('Area Cannot Be Deleted')).toBeInTheDocument()
    expect(screen.getByText(/Reassign or delete those cameras first/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete Area' })).not.toBeInTheDocument()
  })
})
