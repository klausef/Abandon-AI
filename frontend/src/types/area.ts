import type { DataSource, DateTimeString } from './common'

export interface Area {
  id: string
  name: string
  city: string
  province: string
  description: string
  createdAt: DateTimeString
  updatedAt: DateTimeString
  source: DataSource
}

export interface AreaInput {
  name: string
  city: string
  province: string
  description: string
}
