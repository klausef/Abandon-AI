import type { LucideIcon } from 'lucide-react'
import { Card } from '../../../components/ui/Card'

type MetricTone = 'cyan' | 'green' | 'amber' | 'red' | 'violet' | 'slate'

interface MetricCardProps {
  detail: string
  icon: LucideIcon
  label: string
  tone: MetricTone
  value: number
}

const toneStyles: Record<
  MetricTone,
  { accent: string; icon: string; value: string }
> = {
  cyan: {
    accent: 'from-cyan-400/50',
    icon: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
    value: 'text-cyan-50',
  },
  green: {
    accent: 'from-emerald-400/50',
    icon: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    value: 'text-emerald-50',
  },
  amber: {
    accent: 'from-amber-400/50',
    icon: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    value: 'text-amber-50',
  },
  red: {
    accent: 'from-rose-400/50',
    icon: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
    value: 'text-rose-50',
  },
  violet: {
    accent: 'from-violet-400/50',
    icon: 'border-violet-400/20 bg-violet-400/10 text-violet-300',
    value: 'text-violet-50',
  },
  slate: {
    accent: 'from-slate-400/40',
    icon: 'border-slate-600 bg-slate-800 text-slate-300',
    value: 'text-slate-50',
  },
}

export function MetricCard({
  detail,
  icon: Icon,
  label,
  tone,
  value,
}: MetricCardProps) {
  const styles = toneStyles[tone]

  return (
    <Card className="group relative overflow-hidden p-4 sm:p-5">
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${styles.accent} to-transparent opacity-70`}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p
            className={`mt-2 text-3xl font-semibold tracking-[-0.04em] ${styles.value}`}
          >
            {value.toLocaleString()}
          </p>
        </div>
        <div
          className={`grid size-10 shrink-0 place-items-center rounded-xl border transition-transform group-hover:scale-105 ${styles.icon}`}
        >
          <Icon aria-hidden="true" className="size-[1.125rem]" />
        </div>
      </div>
      <p className="mt-3 truncate text-[0.6875rem] text-slate-500">{detail}</p>
    </Card>
  )
}
