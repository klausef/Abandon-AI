import { appError, type AppRole, type AppUser } from './auth'

export type BackendPermission =
  | 'monitoring:view'
  | 'cameras:view'
  | 'cameras:manage'
  | 'detections:view'
  | 'incidents:view'
  | 'incidents:manage'
  /** Operate on incidents assigned to the caller. Never grants global access. */
  | 'incidents:operate'
  | 'reports:view'
  | 'users:manage'
  | 'settings:view'

const rolePermissions: Record<AppRole, ReadonlySet<BackendPermission>> = {
  Administrator: new Set<BackendPermission>([
    'monitoring:view',
    'cameras:view',
    'cameras:manage',
    'detections:view',
    'incidents:view',
    'incidents:manage',
    'incidents:operate',
    'reports:view',
    'users:manage',
    'settings:view',
  ]),
  Supervisor: new Set<BackendPermission>([
    'monitoring:view',
    'cameras:view',
    'detections:view',
    'incidents:view',
    'incidents:manage',
    'incidents:operate',
    'reports:view',
  ]),
  'Security Officer': new Set<BackendPermission>([
    'monitoring:view',
    'detections:view',
    'incidents:view',
    'incidents:operate',
  ]),
}

export function hasPermission(
  role: AppRole,
  permission: BackendPermission,
): boolean {
  return rolePermissions[role].has(permission)
}

export function requirePermission(
  user: AppUser,
  permission: BackendPermission,
): void {
  if (!hasPermission(user.role, permission)) {
    throw appError(
      'FORBIDDEN',
      `The ${user.role} role cannot perform this action.`,
    )
  }
}
