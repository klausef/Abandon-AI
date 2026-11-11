import type { UserRole } from '../../types'

export type Permission =
  | 'monitoring:view'
  | 'cameras:view'
  | 'cameras:manage'
  | 'areas:view'
  | 'areas:manage'
  | 'detections:view'
  | 'incidents:view'
  | 'incidents:manage'
  | 'reports:view'
  | 'users:manage'
  | 'settings:view'

const permissions: Record<UserRole, ReadonlySet<Permission>> = {
  Administrator: new Set<Permission>([
    'monitoring:view', 'cameras:view', 'cameras:manage', 'areas:view', 'areas:manage', 'detections:view',
    'incidents:view', 'incidents:manage', 'reports:view', 'users:manage', 'settings:view',
  ]),
  'Security Officer': new Set<Permission>([
    'monitoring:view', 'cameras:view', 'areas:view', 'detections:view', 'incidents:view',
  ]),
  Supervisor: new Set<Permission>([
    'monitoring:view', 'cameras:view', 'cameras:manage', 'areas:view', 'areas:manage', 'detections:view', 'incidents:view',
    'incidents:manage', 'reports:view',
  ]),
}

export function hasPermission(role: UserRole, permission: Permission) {
  return permissions[role].has(permission)
}
