import type { SecurityOfficer } from '../types'

export const mockOfficers: readonly SecurityOfficer[] = [
  {
    id: 'SEC-001',
    name: 'Security Officer 01',
    role: 'Security Officer',
    status: 'Active',
    mock: true,
  },
  {
    id: 'SEC-002',
    name: 'Security Officer 02',
    role: 'Security Officer',
    status: 'Active',
    mock: true,
  },
  {
    id: 'SEC-003',
    name: 'Security Supervisor',
    role: 'Supervisor',
    status: 'Active',
    mock: true,
  },
]
