import type { ReactNode } from 'react'

interface PageHeaderProps {
  action?: ReactNode
  description: string
  eyebrow?: string
  title: string
}

export function PageHeader({
  action,
  description,
  eyebrow,
  title,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-2 font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-cyan-400 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-slate-50 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-[0.9375rem]">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
