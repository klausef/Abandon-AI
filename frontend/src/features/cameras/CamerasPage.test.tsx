import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CamerasPage } from './CamerasPage'

describe('Camera Management page', () => {
  it('loads five cameras and updates the table and summary after adding one', async () => {
    const user = userEvent.setup()
    render(<CamerasPage />)

    expect(await screen.findAllByText('Public Market Entrance Camera')).not.toHaveLength(0)
    expect(screen.getByText('Total Cameras').previousElementSibling).toHaveTextContent(
      '5',
    )

    await user.click(screen.getByRole('button', { name: 'Add Camera' }))
    const dialog = screen.getByRole('dialog')
    await user.type(
      within(dialog).getByLabelText(/Camera Name/),
      'Engineering Lobby Camera',
    )
    await user.type(within(dialog).getByLabelText(/Location/), 'Engineering Lobby')
    await user.type(
      within(dialog).getByLabelText(/Building/),
      'Engineering Building',
    )
    await user.type(within(dialog).getByLabelText(/IP Address/), '192.168.1.120')
    await user.click(within(dialog).getByRole('button', { name: 'Add Camera' }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('Camera added')).toBeInTheDocument()
    expect(screen.getByText('Total Cameras').previousElementSibling).toHaveTextContent(
      '6',
    )
    expect(screen.getAllByText('CAM-006').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Engineering Lobby Camera').length).toBeGreaterThan(0)
  })

  it('switches to the reusable demo area catalog', async () => {
    const user = userEvent.setup()
    render(<CamerasPage />)

    await screen.findAllByText('Public Market Entrance Camera')
    await user.click(screen.getByRole('tab', { name: /Areas/ }))

    expect(screen.getByText('Demo Areas')).toBeInTheDocument()
    expect(screen.getAllByText('Valencia Public Market').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Add Area' })).toBeInTheDocument()
  })

  it('adds, edits, and deletes an unassigned demo area', async () => {
    const user = userEvent.setup()
    render(<CamerasPage />)

    await screen.findAllByText('Public Market Entrance Camera')
    await user.click(screen.getByRole('tab', { name: /Areas/ }))
    await user.click(screen.getByRole('button', { name: 'Add Area' }))

    let dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/Area Name/), 'Community Park')
    await user.type(
      within(dialog).getByLabelText('Description'),
      'Demo public park reference.',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Add Area' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Area added')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Edit Community Park' })[0])
    dialog = screen.getByRole('dialog')
    const nameInput = within(dialog).getByLabelText(/Area Name/)
    await user.clear(nameInput)
    await user.type(nameInput, 'Community Park Area')
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Area updated')).toBeInTheDocument()

    await user.click(
      screen.getAllByRole('button', { name: 'Delete Community Park Area' })[0],
    )
    dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete Area' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Area deleted')).toBeInTheDocument()
  })
})
