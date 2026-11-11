import {
  Camera,
  ChartNoAxesCombined,
  CircleUserRound,
  History,
  LayoutDashboard,
  RadioTower,
  Settings,
  ShieldAlert,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Permission } from '../features/users/permissions'

export interface NavigationItem {
  label: string
  path: string
  description: string
  icon: LucideIcon
  permission?: Permission
}

export const navigationItems: readonly NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/',
    description: 'Public-space safety operations overview',
    icon: LayoutDashboard,
  },
  {
    label: 'Live Monitoring',
    path: '/monitoring',
    description: 'Simulated CCTV monitoring workspace',
    icon: RadioTower,
    permission: 'monitoring:view',
  },
  {
    label: 'Cameras',
    path: '/cameras',
    description: 'Camera inventory, demo areas, and monitoring controls',
    icon: Camera,
    permission: 'cameras:view',
  },
  {
    label: 'Detection History',
    path: '/detections',
    description: 'Simulated object detection records',
    icon: History,
    permission: 'detections:view',
  },
  {
    label: 'Incidents',
    path: '/incidents',
    description: 'Review and manage safety incidents',
    icon: ShieldAlert,
    permission: 'incidents:view',
  },
  {
    label: 'Reports',
    path: '/reports',
    description: 'Incident statistics and operational trends',
    icon: ChartNoAxesCombined,
    permission: 'reports:view',
  },
  {
    label: 'User Management',
    path: '/users',
    description: 'Simulated accounts and role previews',
    icon: CircleUserRound,
    permission: 'users:manage',
  },
  {
    label: 'Settings',
    path: '/settings',
    description: 'System preferences and integration status',
    icon: Settings,
    permission: 'settings:view',
  },
]

export function getNavigationItem(pathname: string): NavigationItem | undefined {
  return navigationItems.find(({ path }) => {
    if (path === '/') {
      return pathname === path
    }

    return pathname === path || pathname.startsWith(`${path}/`)
  })
}
