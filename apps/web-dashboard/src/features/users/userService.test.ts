import { describe, expect, it } from 'vitest'
import { mockUsers } from '../../mocks'
import { activityLogService, MockUserService } from '../../services'

const actor = mockUsers[0]
const input = {
  fullName: 'New Security Officer',
  email: 'new.officer@example.org',
  badgeNumber: 'SEC-200',
  role: 'Security Officer' as const,
}

describe('MockUserService', () => {
  it('creates users and linked officer identities', async () => {
    const service = new MockUserService(mockUsers)
    const created = await service.createUser(input, actor)
    expect(created.id).toBe('USR-005')
    expect(created.officerId).toBe('SEC-004')
    expect((await service.getUsers())).toHaveLength(5)
    expect(service.getSecurityOfficers().some((officer) => officer.id === 'SEC-004')).toBe(true)
  })

  it('rejects duplicate email addresses case-insensitively', async () => {
    const service = new MockUserService(mockUsers)
    expect(() =>
      service.createUser({ ...input, email: 'MAYA.CHEN@EXAMPLE.ORG' }, actor),
    ).toThrow('Email address must be unique.')
  })

  it('updates and validates users', async () => {
    const service = new MockUserService(mockUsers)
    const updated = await service.updateUser(
      'USR-002',
      { ...input, email: 'daniel.updated@example.org', role: 'Supervisor' },
      actor,
    )
    expect(updated.email).toBe('daniel.updated@example.org')
    expect(updated.role).toBe('Supervisor')
  })

  it('activates, deactivates, and deletes accounts', async () => {
    const service = new MockUserService(mockUsers)
    const inactive = await service.toggleStatus('USR-002', actor)
    expect(inactive.status).toBe('Inactive')
    expect(service.isOfficerActive('SEC-001')).toBe(false)
    expect(await service.deleteUser('USR-003', actor)).toBe(true)
    expect(await service.getUsers()).toHaveLength(3)
  })

  it('records user management activity logs', async () => {
    const service = new MockUserService(mockUsers)
    const before = activityLogService.getSnapshot().length
    const created = await service.createUser(input, actor)
    await service.updateUser(created.id, { ...input, fullName: 'Updated Officer' }, actor)
    await service.toggleStatus(created.id, actor)
    await service.deleteUser(created.id, actor)
    const logs = activityLogService.getSnapshot().slice(0, 4)
    expect(activityLogService.getSnapshot()).toHaveLength(before + 4)
    expect(logs.map((log) => log.type)).toEqual([
      'user_deleted',
      'account_status_changed',
      'user_updated',
      'user_created',
    ])
  })
})
