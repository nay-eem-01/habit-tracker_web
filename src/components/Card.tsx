import type { ReactNode } from 'react'
import { SURFACE } from './styles'

/** A titled white card, the dashboard's building block. */
export function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className={`${SURFACE} p-5 sm:p-6`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
