import type { ComponentProps } from 'react'

interface CardProps extends ComponentProps<'section'> {
  surface?: 'default' | 'subtle'
}

export function Card({
  className = '',
  surface = 'default',
  ...props
}: CardProps) {
  const surfaceClass =
    surface === 'default'
      ? 'border-slate-800/90 bg-command-900/85 shadow-[0_18px_50px_rgba(0,0,0,0.16)]'
      : 'border-slate-800/70 bg-slate-950/30'

  return (
    <section
      className={`rounded-2xl border ${surfaceClass} ${className}`}
      {...props}
    />
  )
}
