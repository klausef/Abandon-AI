import type { Area } from '../types'

/**
 * Generic demo/reference areas in Valencia City, Bukidnon. These records do
 * not assert that cameras are installed at any real location.
 */
export const mockAreas: readonly Area[] = [
  {
    id: 'AREA-001',
    name: 'Valencia Public Market',
    city: 'Valencia City',
    province: 'Bukidnon',
    description: 'Demo reference for a commonly busy public-market area.',
    createdAt: '2026-11-09T08:00:00+08:00',
    updatedAt: '2026-11-09T08:00:00+08:00',
    source: 'MOCK',
  },
  {
    id: 'AREA-002',
    name: 'Valencia Transport Terminal',
    city: 'Valencia City',
    province: 'Bukidnon',
    description: 'Demo reference for a passenger terminal and waiting area.',
    createdAt: '2026-11-09T08:01:00+08:00',
    updatedAt: '2026-11-09T08:01:00+08:00',
    source: 'MOCK',
  },
  {
    id: 'AREA-003',
    name: 'Valencia City Plaza',
    city: 'Valencia City',
    province: 'Bukidnon',
    description: 'Demo reference for an open public activity and gathering area.',
    createdAt: '2026-11-09T08:02:00+08:00',
    updatedAt: '2026-11-09T08:02:00+08:00',
    source: 'MOCK',
  },
  {
    id: 'AREA-004',
    name: 'Public Service Center',
    city: 'Valencia City',
    province: 'Bukidnon',
    description: 'Demo reference for a public-service lobby and queue area.',
    createdAt: '2026-11-09T08:03:00+08:00',
    updatedAt: '2026-11-09T08:03:00+08:00',
    source: 'MOCK',
  },
  {
    id: 'AREA-005',
    name: 'Valencia Commercial District',
    city: 'Valencia City',
    province: 'Bukidnon',
    description: 'Demo reference for a busy loading and pedestrian waiting area.',
    createdAt: '2026-11-09T08:04:00+08:00',
    updatedAt: '2026-11-09T08:04:00+08:00',
    source: 'MOCK',
  },
]
