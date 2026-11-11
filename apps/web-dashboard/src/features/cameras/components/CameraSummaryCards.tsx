import { Camera, Eye, Wifi, WifiOff, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import type { Camera as CameraRecord } from '../../../types'

interface CameraSummaryCardsProps {
  cameras: readonly CameraRecord[]
}

interface SummaryCardProps {
  icon: LucideIcon
  label: string
  tone: 'cyan' | 'green' | 'red' | 'amber' | 'violet'
  value: number
}

const toneClasses: Record<SummaryCardProps['tone'], string> = {
  cyan: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  green: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  red: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
  amber: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  violet: 'border-violet-400/20 bg-violet-400/10 text-violet-300',
}

function SummaryCard({ icon: Icon, label, tone, value }: SummaryCardProps) {
  return (
    <Card className="flex items-center gap-4 p-4 sm:p-5">
      <div
        className={`grid size-10 shrink-0 place-items-center rounded-xl border ${toneClasses[tone]}`}
      >
        <Icon aria-hidden="true" className="size-[1.125rem]" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-50">
          {value}
        </p>
        <p className="truncate text-[0.6875rem] text-slate-500">{label}</p>
      </div>
    </Card>
  )
}

export function CameraSummaryCards({ cameras }: CameraSummaryCardsProps) {
  const online = cameras.filter((camera) => camera.status === 'Online').length
  const offline = cameras.filter((camera) => camera.status === 'Offline').length
  const maintenance = cameras.filter(
    (camera) => camera.status === 'Maintenance',
  ).length
  const monitoring = cameras.filter((camera) => camera.monitoringEnabled).length

  return (
    <section
      aria-label="Camera inventory summary"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5"
    >
      <SummaryCard
        icon={Camera}
        label="Total Cameras"
        tone="cyan"
        value={cameras.length}
      />
      <SummaryCard
        icon={Wifi}
        label="Online Cameras"
        tone="green"
        value={online}
      />
      <SummaryCard
        icon={WifiOff}
        label="Offline Cameras"
        tone="red"
        value={offline}
      />
      <SummaryCard
        icon={Wrench}
        label="Under Maintenance"
        tone="amber"
        value={maintenance}
      />
      <SummaryCard
        icon={Eye}
        label="Monitoring Enabled"
        tone="violet"
        value={monitoring}
      />
    </section>
  )
}
