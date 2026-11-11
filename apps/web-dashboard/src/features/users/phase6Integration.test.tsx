import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Sidebar } from '../../components/navigation/Sidebar'
import { CamerasPage } from '../cameras/CamerasPage'
import { IncidentsPage } from '../incidents/IncidentsPage'
import { mockUsers } from '../../mocks'
import { hasPermission } from './permissions'
import { MockAuthContext, type MockAuthValue } from './auth/mockAuthContext'
import { RequirePermission } from './auth/RequirePermission'

function authFor(index: number): MockAuthValue {
  const currentUser = mockUsers[index]
  return {
    currentUser,
    users: mockUsers,
    selectUser: vi.fn(),
    can: (permission) => hasPermission(currentUser.role, permission),
  }
}

function withAuth(ui: ReactNode, value: MockAuthValue) {
  return render(
    <MemoryRouter>
      <MockAuthContext.Provider value={value}>{ui}</MockAuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('Phase 6 authorization integration', () => {
  it('protects direct routes and hides unauthorized navigation', () => {
    const officerAuth = authFor(1)
    withAuth(
      <>
        <RequirePermission permission="reports:view">
          <div>Protected report</div>
        </RequirePermission>
        <Sidebar isOpen onClose={vi.fn()} />
      </>,
      officerAuth,
    )
    expect(screen.getByText('Access denied')).toBeInTheDocument()
    expect(screen.queryByText('Protected report')).not.toBeInTheDocument()
    expect(screen.queryByText('Reports')).not.toBeInTheDocument()
    expect(screen.queryByText('User Management')).not.toBeInTheDocument()
    expect(screen.getByText('Detection History')).toBeInTheDocument()
  })

  it('allows supervisors to manage cameras and areas', async () => {
    withAuth(<CamerasPage />, authFor(3))
    expect(await screen.findAllByText('Public Market Entrance Camera')).not.toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Add Camera' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Edit Public Market Entrance Camera/ }).length).toBeGreaterThan(0)
    expect(screen.getByRole('tab', { name: /Areas/ })).toBeInTheDocument()
  })

  it('lets security officers identify areas without editing them', async () => {
    const user = userEvent.setup()
    withAuth(<CamerasPage />, authFor(1))
    expect(await screen.findAllByText('Public Market Entrance Camera')).not.toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Add Camera' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Areas/ }))
    expect(screen.getAllByText('Valencia Public Market').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Add Area' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Valencia Public Market' })).not.toBeInTheDocument()
  })

  it('limits Security Officers to incidents assigned to their officer identity', async () => {
    withAuth(<IncidentsPage />, authFor(1))
    expect(await screen.findAllByText('INC-2026-0002')).not.toHaveLength(0)
    await waitFor(() => {
      expect(screen.queryAllByText('INC-2026-0001')).toHaveLength(0)
      expect(screen.queryAllByText('INC-2026-0003')).toHaveLength(0)
    })
    expect(
      screen.queryByRole('button', { name: /Resolve INC-2026-0002/ }),
    ).not.toBeInTheDocument()
  })
})
