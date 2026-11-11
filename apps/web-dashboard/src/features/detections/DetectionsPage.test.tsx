import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DetectionsPage } from './DetectionsPage'

describe('Detection History page', () => {
  it('renders initial records, filters search results, and opens details', async () => {
    const user = userEvent.setup()
    render(<DetectionsPage />)

    expect(await screen.findAllByText('DET-001')).not.toHaveLength(0)
    expect(screen.getByText('Total Detections').previousElementSibling).toHaveTextContent(
      '4',
    )

    await user.type(
      screen.getByRole('searchbox', { name: 'Search detection history' }),
      'DET-003',
    )
    await waitFor(() => {
      expect(screen.queryAllByText('DET-001')).toHaveLength(0)
      expect(screen.getAllByText('DET-003').length).toBeGreaterThan(0)
    })

    await user.click(
      screen.getAllByRole('button', { name: 'View details for DET-003' })[0],
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByText('Handbag').length).toBeGreaterThan(0)
  })
})
