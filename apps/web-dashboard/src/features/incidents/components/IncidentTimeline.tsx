import {
  BellRing,
  CheckCircle2,
  FileText,
  SearchCheck,
  ShieldAlert,
  UserRoundCheck,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { IncidentActivity, IncidentActivityType } from '../../../types'
import { formatDateTime } from '../../../utils/formatters'

const activityIcons: Record<IncidentActivityType, LucideIcon> = {
  detected: BellRing,
  created: ShieldAlert,
  acknowledged: CheckCircle2,
  assigned: UserRoundCheck,
  unassigned: UserRoundCheck,
  investigation_started: SearchCheck,
  note_added: FileText,
  resolved: CheckCircle2,
  false_alarm: XCircle,
}

export function IncidentTimeline({ activities }: { activities: readonly IncidentActivity[] }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-200">Activity timeline</h3>
      <div className="mt-4 space-y-0">
        {activities.map((activity, index) => {
          const Icon = activityIcons[activity.type]
          return (
            <div className="relative flex gap-3 pb-5" key={activity.id}>
              {index < activities.length - 1 ? <span className="absolute top-8 bottom-0 left-[0.9375rem] w-px bg-slate-800" /> : null}
              <div className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full border border-slate-700 bg-command-900 text-cyan-300">
                <Icon aria-hidden="true" className="size-3.5" />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-xs leading-5 text-slate-300">{activity.description}</p>
                <p className="mt-1 text-[0.625rem] text-slate-600">
                  {activity.actorName} · {formatDateTime(activity.timestamp)} · MOCK
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
