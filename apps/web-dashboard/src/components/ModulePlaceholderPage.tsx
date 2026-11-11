import { CheckCircle2, CircleDashed, LockKeyhole, Waypoints } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from './ui/Card'
import { MockDataBadge } from './ui/MockDataBadge'
import { PageHeader } from './ui/PageHeader'
import { StatusBadge } from './ui/StatusBadge'

interface ModulePlaceholderPageProps {
  description: string
  icon: LucideIcon
  phase: string
  plannedCapabilities: readonly string[]
  title: string
}

const foundationChecks = [
  'Responsive route and navigation configured',
  'Typed mock records separated from the interface',
  'Provider boundary ready for future integrations',
]

export function ModulePlaceholderPage({
  description,
  icon: Icon,
  phase,
  plannedCapabilities,
  title,
}: ModulePlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        action={<MockDataBadge />}
        description={description}
        eyebrow={`${phase} module`}
        title={title}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,0.7fr)]">
        <Card className="relative overflow-hidden p-5 sm:p-7">
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-20 size-64 rounded-full bg-cyan-400/5 blur-3xl"
          />

          <div className="relative">
            <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                  <Icon aria-hidden="true" className="size-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-100">Module foundation ready</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Feature implementation is intentionally scheduled for {phase}.
                  </p>
                </div>
              </div>
              <StatusBadge dot tone="green">
                Route active
              </StatusBadge>
            </div>

            <div className="grid gap-8 pt-6 md:grid-cols-2">
              <div>
                <p className="mb-4 text-[0.6875rem] font-bold tracking-[0.16em] text-slate-500 uppercase">
                  Foundation complete
                </p>
                <ul className="space-y-3">
                  {foundationChecks.map((item) => (
                    <li className="flex gap-3 text-sm leading-5 text-slate-300" key={item}>
                      <CheckCircle2
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-emerald-400"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-4 text-[0.6875rem] font-bold tracking-[0.16em] text-slate-500 uppercase">
                  Planned capabilities
                </p>
                <ul className="space-y-3">
                  {plannedCapabilities.map((item) => (
                    <li className="flex gap-3 text-sm leading-5 text-slate-400" key={item}>
                      <CircleDashed
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-slate-600"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5" surface="subtle">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-amber-400/10 text-amber-300">
                <LockKeyhole aria-hidden="true" className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-200">Safety boundary</h2>
                <p className="mt-0.5 text-xs text-slate-500">Phase 1 guardrail</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              This workspace contains no real surveillance feeds, AI inference, or public-safety alerts. All available records are marked MOCK.
            </p>
          </Card>

          <Card className="p-5" surface="subtle">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300">
                <Waypoints aria-hidden="true" className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-200">Integration path</h2>
                <p className="mt-0.5 text-xs text-slate-500">Modular by design</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Mock providers are isolated behind typed contracts so cameras, FastAPI services, and AI providers can be connected in later phases.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
