import type { ActivityLog, ActivityLogType, UserAccount } from '../types'

type Listener = () => void

export class MockActivityLogService {
  private logs: readonly ActivityLog[] = []
  private listeners = new Set<Listener>()
  private nextId = 1

  getSnapshot = () => this.logs
  subscribe = (listener: Listener) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  record(
    type: ActivityLogType,
    actor: Pick<UserAccount, 'id' | 'fullName'>,
    targetId: string,
    description: string,
  ) {
    const log: ActivityLog = {
      id: `LOG-${this.nextId.toString().padStart(4, '0')}`,
      type,
      actorId: actor.id,
      actorName: actor.fullName,
      targetId,
      description,
      timestamp: new Date().toISOString(),
      mock: true,
    }
    this.nextId += 1
    this.logs = [log, ...this.logs]
    this.listeners.forEach((listener) => listener())
    return structuredClone(log)
  }
}

export const activityLogService = new MockActivityLogService()
