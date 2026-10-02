import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Swaps the label for a spinner and blocks further taps. */
  busy?: boolean
}

/** The one primary action on a screen. Presses in, never sits flat. */
export function Button({ className = '', busy, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={
        'inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-lapis px-6 font-medium text-white ' +
        'shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_8px_20px_-8px_rgb(34_50_143/0.7)] ' +
        'transition-[transform,background-color,box-shadow] duration-150 ease-out active:scale-[0.97] ' +
        'disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100 ' +
        `[@media(hover:hover)]:hover:bg-lapis-deep ${className}`
      }
    >
      {busy && <span aria-hidden="true" className="spinner size-4 rounded-full border-2 border-white/35 border-t-white" />}
      {children}
    </button>
  )
}
