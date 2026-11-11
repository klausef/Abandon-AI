import { createContext } from 'react'
import { mockUsers } from '../../../mocks'
import type { UserAccount } from '../../../types'
import { hasPermission, type Permission } from '../permissions'

export interface MockAuthValue {
  currentUser: UserAccount
  users: readonly UserAccount[]
  selectUser: (userId: string) => void
  can: (permission: Permission) => boolean
}

export const defaultAuthValue: MockAuthValue = {
  currentUser: mockUsers[0],
  users: mockUsers,
  selectUser: () => undefined,
  can: (permission) => hasPermission(mockUsers[0].role, permission),
}

export const MockAuthContext = createContext<MockAuthValue>(defaultAuthValue)
