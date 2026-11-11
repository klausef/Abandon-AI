import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { IncidentsPage } from './IncidentsPage'

describe('Incident Management page', () => {
  it('renders initial records, searches, and acknowledges a new incident', async () => {
    const user = userEvent.setup()
    render(<IncidentsPage />)

    expect(await screen.findAllByText('INC-2026-0001')).not.toHaveLength(0)
    expect(screen.getByText('Total Incidents').previousElementSibling).toHaveTextContent(
      '3',
    )

    const search = screen.getByRole('searchbox', { name: 'Search incidents' })
    await user.type(search, 'Passenger Waiting Area')
    await waitFor(() => {
      expect(screen.getAllByText('INC-2026-0001').length).toBeGreaterThan(0)
      expect(screen.queryAllByText('INC-2026-0002')).toHaveLength(0)
    })
    await user.clear(search)

    await user.click(
      screen.getAllByRole('button', {
        name: 'Acknowledge INC-2026-0001',
      })[0],
    )
    await user.click(
      screen.getByRole('button', { name: 'Acknowledge Incident' }),
    )

    await waitFor(() => {
      const summaryLabel = screen
        .getAllByText('Acknowledged')
        .find((element) => element.tagName === 'P')
      expect(summaryLabel?.previousElementSibling).toHaveTextContent('1')
    })
    expect(screen.getByText('Workflow updated')).toBeInTheDocument()
  })
})
