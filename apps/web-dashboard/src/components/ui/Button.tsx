import type { ComponentProps } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'default' | 'small' | 'icon'

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border-cyan-400/20 bg-cyan-400 text-slate-950 hover:bg-cyan-300 disabled:bg-cyan-700',
  secondary:
    'border-slate-700 bg-slate-800 text-slate-100 hover:border-slate-600 hover:bg-slate-700',
  danger:
    'border-rose-400/20 bg-rose-500 text-white hover:bg-rose-400 disabled:bg-rose-900',
  ghost:
    'border-transparent bg-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-100',
}

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-10 px-4 text-sm',
  small: 'h-8 px-3 text-xs',
  icon: 'size-10 p-0',
}

export function Button({
  className = '',
  size = 'default',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      type={type}
      {...props}
    />
  )
}
