import { Boxes, ScanSearch, ScanText, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import type { Detection } from '../../../types'

interface DetectionSummaryCardsProps {
  detections: readonly Detection[]
}

interface SummaryItemProps {
  icon: LucideIcon
  label: string
  tone: 'cyan' | 'green' | 'amber' | 'violet'
  value: number
}

const toneClasses: Record<SummaryItemProps['tone'], string> = {
  cyan: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  green: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  amber: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  violet: 'border-violet-400/20 bg-violet-400/10 text-violet-300',
}

function SummaryItem({ icon: Icon, label, tone, value }: SummaryItemProps) {
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

export function DetectionSummaryCards({
  detections,
}: DetectionSummaryCardsProps) {
  const peopleCount = detections.filter(
    (detection) => detection.objectClass === 'person',
  ).length
  const objectCategories = new Set(
    detections
      .filter((detection) => detection.objectClass !== 'person')
      .map((detection) => detection.objectClass),
  ).size
  const activeTrackingIds = new Set(
    detections.map((detection) => detection.trackingId),
  ).size

  return (
    <section
      aria-label="Detection summary"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <SummaryItem
        icon={ScanSearch}
        label="Total Detections"
        tone="cyan"
        value={detections.length}
      />
      <SummaryItem
        icon={Users}
        label="People Detected"
        tone="green"
        value={peopleCount}
      />
      <SummaryItem
        icon={Boxes}
        label="Abandoned-Object Categories Detected"
        tone="amber"
        value={objectCategories}
      />
      <SummaryItem
        icon={ScanText}
        label="Active Tracking IDs"
        tone="violet"
        value={activeTrackingIds}
      />
    </section>
  )
}
