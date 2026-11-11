import { useState, useSyncExternalStore, type ReactNode } from 'react'
import { userService } from '../../../services'
import { hasPermission } from '../permissions'
import { defaultAuthValue, MockAuthContext } from './mockAuthContext'

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const users = useSyncExternalStore(
    userService.subscribe,
    userService.getSnapshot,
    userService.getSnapshot,
  )
  const [currentUserId, setCurrentUserId] = useState(defaultAuthValue.currentUser.id)
  const currentUser =
    users.find((user) => user.id === currentUserId) ??
    users.find((user) => user.status === 'Active') ??
    defaultAuthValue.currentUser

  return (
    <MockAuthContext.Provider
      value={{
        currentUser,
        users,
        selectUser: setCurrentUserId,
        can: (permission) =>
          currentUser.status === 'Active' && hasPermission(currentUser.role, permission),
      }}
    >
      {children}
    </MockAuthContext.Provider>
  )
}
