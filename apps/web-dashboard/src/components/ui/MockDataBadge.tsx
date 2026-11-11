import { FlaskConical } from 'lucide-react'
import { StatusBadge } from './StatusBadge'

export function MockDataBadge() {
  return (
    <StatusBadge tone="amber">
      <FlaskConical aria-hidden="true" className="size-3" />
      Mock data
    </StatusBadge>
  )
}
