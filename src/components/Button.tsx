import type { ButtonHTMLAttributes } from 'react'
import { PRIMARY } from './styles'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Swaps the label for a spinner and blocks further taps. */
  busy?: boolean
  /** `small` sits next to the secondary buttons, at their height. */
  size?: 'regular' | 'small'
}

/** The one primary action on a screen. Presses in, never sits flat. */
export function Button({ className = '', busy, disabled, size = 'regular', children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={
        `${PRIMARY} ${size === 'small' ? 'h-10 px-4 text-sm' : 'h-12 px-6'} ` +
        `disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100 ${className}`
      }
    >
      {busy && <span aria-hidden="true" className="spinner size-4 rounded-full border-2 border-navy/30 border-t-navy" />}
      {children}
    </button>
  )
}
