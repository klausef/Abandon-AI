import type { ReactNode } from 'react'

type BadgeTone = 'cyan' | 'green' | 'amber' | 'red' | 'slate'

interface StatusBadgeProps {
  children: ReactNode
  className?: string
  dot?: boolean
  tone?: BadgeTone
}

const toneClasses: Record<BadgeTone, string> = {
  cyan: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  green: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  amber: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  red: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
  slate: 'border-slate-700 bg-slate-800/70 text-slate-300',
}

const dotClasses: Record<BadgeTone, string> = {
  cyan: 'bg-cyan-300',
  green: 'bg-emerald-300',
  amber: 'bg-amber-300',
  red: 'bg-rose-300',
  slate: 'bg-slate-400',
}

export function StatusBadge({
  children,
  className = '',
  dot = false,
  tone = 'slate',
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-bold tracking-[0.12em] uppercase ${toneClasses[tone]} ${className}`}
    >
      {dot ? <span className={`size-1.5 rounded-full ${dotClasses[tone]}`} /> : null}
      {children}
    </span>
  )
}
