import { createBrowserRouter, Outlet } from 'react-router-dom'
import { CamerasPage } from '../features/cameras/CamerasPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { DetectionsPage } from '../features/detections/DetectionsPage'
import { MonitoringPage } from '../features/monitoring/MonitoringPage'
import { NotFoundPage } from '../features/NotFoundPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { RequirePermission } from '../features/users/auth/RequirePermission'
import { AppLayout } from '../layouts/AppLayout'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: 'monitoring', element: <RequirePermission permission="monitoring:view"><MonitoringPage /></RequirePermission> },
      { path: 'cameras', element: <RequirePermission permission="cameras:view"><CamerasPage /></RequirePermission> },
      { path: 'detections', element: <RequirePermission permission="detections:view"><DetectionsPage /></RequirePermission> },
      {
        element: <RequirePermission permission="incidents:view"><Outlet /></RequirePermission>,
        children: [{
          path: 'incidents',
          lazy: async () => {
            const incidentModule = await import('../features/incidents/IncidentsPage')
            return { Component: incidentModule.IncidentsPage }
          },
        }],
      },
      {
        element: <RequirePermission permission="reports:view"><Outlet /></RequirePermission>,
        children: [{ path: 'reports', lazy: async () => {
          const reportModule = await import('../features/reports/ReportsPage')
          return { Component: reportModule.ReportsPage }
        }}],
      },
      {
        element: <RequirePermission permission="users:manage"><Outlet /></RequirePermission>,
        children: [{ path: 'users', lazy: async () => {
          const userModule = await import('../features/users/UsersPage')
          return { Component: userModule.UsersPage }
        }}],
      },
      { path: 'settings', element: <RequirePermission permission="settings:view"><SettingsPage /></RequirePermission> },
      { path: '*', Component: NotFoundPage },
    ],
  },
])
