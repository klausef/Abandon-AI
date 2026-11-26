import type { DataSource, DateTimeString } from './common'

export type UserRole = 'Administrator' | 'Security Officer' | 'Supervisor'
export type UserStatus = 'Active' | 'Inactive'

export interface UserAccount {
  id: string
  fullName: string
  email: string
  badgeNumber: string
  role: UserRole
  status: UserStatus
  lastActiveAt: DateTimeString
  officerId: string | null
  createdAt: DateTimeString
  updatedAt: DateTimeString
  source: DataSource
}

export interface UserInput {
  fullName: string
  email: string
  badgeNumber: string
  role: UserRole
}
