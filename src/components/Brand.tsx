import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** The mark and the name, linking home; `children` sits after the name (the admin label). */
export function Brand({ to, children }: { to: string; children?: ReactNode }) {
  return (
    <Link to={to} className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
      <span aria-hidden="true" className="grid grid-cols-2 gap-[2px]">
        <span className="size-[7px] rounded-[2px] bg-lapis" />
        <span className="size-[7px] rounded-[2px] bg-lapis" />
        <span className="size-[7px] rounded-[2px] bg-lapis" />
        <span className="size-[7px] rounded-[2px] bg-ember" />
      </span>
      DevHabit
      {children}
    </Link>
  )
}
