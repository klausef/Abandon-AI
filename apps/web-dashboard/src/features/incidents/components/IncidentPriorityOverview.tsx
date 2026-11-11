import { AlertTriangle } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import type { Incident, IncidentPriority } from '../../../types'
import { incidentPriorityLabels } from '../incidentPresentation'

const priorities: readonly IncidentPriority[] = ['low', 'normal', 'high', 'critical']
const styles: Record<IncidentPriority, string> = {
  low: 'bg-slate-400',
  normal: 'bg-cyan-400',
  high: 'bg-amber-400',
  critical: 'bg-rose-400',
}

export function IncidentPriorityOverview({ incidents }: { incidents: readonly Incident[] }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle aria-hidden="true" className="size-4 text-amber-300" />
        <h2 className="text-sm font-semibold text-slate-200">Priority overview</h2>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {priorities.map((priority) => {
          const count = incidents.filter((item) => item.priority === priority).length
          return (
            <div
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-2.5"
              key={priority}
            >
              <span className="flex items-center gap-2 text-xs text-slate-400">
                <span className={`size-2 rounded-full ${styles[priority]}`} />
                {incidentPriorityLabels[priority]}
              </span>
              <span className="font-mono text-sm font-bold text-slate-200">{count}</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
