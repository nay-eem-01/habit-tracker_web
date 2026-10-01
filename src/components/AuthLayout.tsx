import type { ReactNode } from 'react'
import { ChainGrid } from './ChainGrid'

/** Sign-in and register share one frame: the chain on the left, the form on the right. */
export function AuthLayout({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[5fr_7fr]">
      <aside className="flex flex-col justify-between gap-8 bg-lapis-deep px-6 py-6 text-white lg:px-12 lg:py-12">
        <p className="font-display text-2xl font-semibold tracking-tight">DevHabit</p>
        <div className="flex flex-col gap-6">
          <ChainGrid />
          <p className="hidden max-w-xs font-display text-2xl leading-snug font-medium lg:block">
            Check in once a day. The chain keeps count.
          </p>
        </div>
      </aside>
      <main className="flex items-center px-6 py-10 lg:px-16">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-4xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-ink-soft">{intro}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
