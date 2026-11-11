import { mockOfficers, mockUsers } from '../mocks'
import type { SecurityOfficer, UserAccount, UserInput } from '../types'
import { activityLogService } from './activityLogService'

type Listener = () => void

export class MockUserService {
  private listeners = new Set<Listener>()
  private nextOfficerId: number
  private nextUserId: number
  private users: readonly UserAccount[]

  constructor(initialUsers: readonly UserAccount[] = mockUsers) {
    this.users = structuredClone(initialUsers)
    this.nextUserId = Math.max(0, ...initialUsers.map((user) => Number(user.id.match(/(\d+)$/)?.[1] ?? 0))) + 1
    this.nextOfficerId = Math.max(0, ...initialUsers.map((user) => Number(user.officerId?.match(/(\d+)$/)?.[1] ?? 0))) + 1
  }

  getSnapshot = () => this.users
  subscribe = (listener: Listener) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  private emit() { this.listeners.forEach((listener) => listener()) }

  private validate(input: UserInput, excludeId?: string) {
    if (!input.fullName.trim()) throw new Error('Full name is required.')
    if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) throw new Error('Enter a valid email address.')
    if (this.users.some((user) => user.id !== excludeId && user.email.toLowerCase() === input.email.trim().toLowerCase())) {
      throw new Error('Email address must be unique.')
    }
  }

  getUsers() { return Promise.resolve(this.users.map((user) => structuredClone(user))) }

  createUser(input: UserInput, actor: UserAccount) {
    this.validate(input)
    const now = new Date().toISOString()
    const needsOfficer = input.role !== 'Administrator'
    const user: UserAccount = {
      id: `USR-${this.nextUserId.toString().padStart(3, '0')}`,
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      badgeNumber: input.badgeNumber.trim(),
      role: input.role,
      status: 'Active',
      lastActiveAt: now,
      officerId: needsOfficer
        ? `SEC-${this.nextOfficerId.toString().padStart(3, '0')}`
        : null,
      createdAt: now,
      updatedAt: now,
      source: 'MOCK',
    }
    this.nextUserId += 1
    if (needsOfficer) this.nextOfficerId += 1
    this.users = [...this.users, user]
    activityLogService.record('user_created', actor, user.id, `Created user ${user.fullName}.`)
    this.emit()
    return Promise.resolve(structuredClone(user))
  }

  updateUser(id: string, input: UserInput, actor: UserAccount) {
    this.validate(input, id)
    const existing = this.users.find((user) => user.id === id)
    if (!existing) return Promise.reject(new Error(`User ${id} was not found.`))
    let officerId = existing.officerId
    if (input.role === 'Administrator') officerId = null
    else if (!officerId) {
      officerId = `SEC-${this.nextOfficerId.toString().padStart(3, '0')}`
      this.nextOfficerId += 1
    }
    const updated: UserAccount = {
      ...existing,
      ...input,
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      badgeNumber: input.badgeNumber.trim(),
      officerId,
      updatedAt: new Date().toISOString(),
    }
    this.users = this.users.map((user) => (user.id === id ? updated : user))
    activityLogService.record('user_updated', actor, id, `Updated user ${updated.fullName}.`)
    this.emit()
    return Promise.resolve(structuredClone(updated))
  }

  deleteUser(id: string, actor: UserAccount) {
    const user = this.users.find((item) => item.id === id)
    if (!user) return Promise.resolve(false)
    this.users = this.users.filter((item) => item.id !== id)
    activityLogService.record('user_deleted', actor, id, `Deleted user ${user.fullName}.`)
    this.emit()
    return Promise.resolve(true)
  }

  toggleStatus(id: string, actor: UserAccount) {
    const user = this.users.find((item) => item.id === id)
    if (!user) return Promise.reject(new Error(`User ${id} was not found.`))
    const updated: UserAccount = {
      ...user,
      status: user.status === 'Active' ? 'Inactive' : 'Active',
      updatedAt: new Date().toISOString(),
    }
    this.users = this.users.map((item) => (item.id === id ? updated : item))
    activityLogService.record(
      'account_status_changed',
      actor,
      id,
      `${updated.status === 'Active' ? 'Activated' : 'Deactivated'} ${updated.fullName}.`,
    )
    this.emit()
    return Promise.resolve(structuredClone(updated))
  }

  isOfficerActive(officerId: string) {
    return this.users.some(
      (user) => user.officerId === officerId && user.status === 'Active',
    )
  }

  getSecurityOfficers(): readonly SecurityOfficer[] {
    return this.users
      .filter((user) => user.officerId && user.role !== 'Administrator')
      .map((user) => ({
        id: user.officerId!,
        name:
          mockOfficers.find((officer) => officer.id === user.officerId)?.name ??
          user.fullName,
        role: user.role,
        status: user.status,
        mock: true,
      }))
  }
}

export const userService = new MockUserService()
