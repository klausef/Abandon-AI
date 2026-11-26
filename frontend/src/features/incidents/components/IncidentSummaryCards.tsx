import {
  BellRing,
  CheckCircle2,
  Eye,
  SearchCheck,
  ShieldAlert,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import type { Incident } from '../../../types'

interface IncidentSummaryCardsProps {
  incidents: readonly Incident[]
}

const items: readonly {
  icon: LucideIcon
  key: Incident['status'] | 'total'
  label: string
  tone: string
}[] = [
  { key: 'total', label: 'Total Incidents', icon: ShieldAlert, tone: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/20' },
  { key: 'new', label: 'New Incidents', icon: BellRing, tone: 'text-rose-300 bg-rose-400/10 border-rose-400/20' },
  { key: 'acknowledged', label: 'Acknowledged', icon: Eye, tone: 'text-amber-300 bg-amber-400/10 border-amber-400/20' },
  { key: 'investigating', label: 'Investigating', icon: SearchCheck, tone: 'text-violet-300 bg-violet-400/10 border-violet-400/20' },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle2, tone: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
  { key: 'false_alarm', label: 'False Alarms', icon: XCircle, tone: 'text-slate-300 bg-slate-400/10 border-slate-400/20' },
]

export function IncidentSummaryCards({ incidents }: IncidentSummaryCardsProps) {
  return (
    <section
      aria-label="Incident summary"
      className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-6"
    >
      {items.map((item) => {
        const Icon = item.icon
        const value =
          item.key === 'total'
            ? incidents.length
            : incidents.filter((incident) => incident.status === item.key).length
        return (
          <Card className="flex items-center gap-3 p-4" key={item.key}>
            <div className={`grid size-9 shrink-0 place-items-center rounded-lg border ${item.tone}`}>
              <Icon aria-hidden="true" className="size-4" />
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-50">
                {value}
              </p>
              <p className="text-[0.625rem] text-slate-500">{item.label}</p>
            </div>
          </Card>
        )
      })}
    </section>
  )
}
