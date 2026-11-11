import { describe, expect, it } from 'vitest'
import { hasPermission } from './permissions'

describe('simulated role permissions', () => {
  it('grants administrators full access', () => {
    expect(hasPermission('Administrator', 'users:manage')).toBe(true)
    expect(hasPermission('Administrator', 'cameras:manage')).toBe(true)
    expect(hasPermission('Administrator', 'areas:manage')).toBe(true)
    expect(hasPermission('Administrator', 'settings:view')).toBe(true)
  })

  it('restricts security officers to operational views', () => {
    expect(hasPermission('Security Officer', 'monitoring:view')).toBe(true)
    expect(hasPermission('Security Officer', 'detections:view')).toBe(true)
    expect(hasPermission('Security Officer', 'incidents:view')).toBe(true)
    expect(hasPermission('Security Officer', 'cameras:view')).toBe(true)
    expect(hasPermission('Security Officer', 'areas:view')).toBe(true)
    expect(hasPermission('Security Officer', 'areas:manage')).toBe(false)
    expect(hasPermission('Security Officer', 'reports:view')).toBe(false)
    expect(hasPermission('Security Officer', 'users:manage')).toBe(false)
  })

  it('allows supervisors to manage cameras and areas', () => {
    expect(hasPermission('Supervisor', 'reports:view')).toBe(true)
    expect(hasPermission('Supervisor', 'cameras:view')).toBe(true)
    expect(hasPermission('Supervisor', 'cameras:manage')).toBe(true)
    expect(hasPermission('Supervisor', 'areas:manage')).toBe(true)
    expect(hasPermission('Supervisor', 'incidents:manage')).toBe(true)
  })
})
