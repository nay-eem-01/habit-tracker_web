import type { ReactNode } from 'react'
import { SECTION_TITLE, SURFACE } from './styles'

/** A titled white panel with a hairline edge, for things that belong together on the dashboard. */
export function Card({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`${SURFACE} p-5 sm:p-6 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={SECTION_TITLE}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
