import type { CSSProperties, ReactNode } from 'react'
import { ChainGrid } from './ChainGrid'

/** Sign-in and register share one frame: the chain on the left, the form on the right. */
export function AuthLayout({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[5fr_6fr]">
      <aside className="grain relative isolate flex flex-col justify-between gap-8 overflow-hidden bg-lapis-deep px-6 py-5 text-white sm:py-6 lg:px-14 lg:py-12">
        {/* two soft light pools: lapis from above, ember from below, so the panel has depth without a gradient blob */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_15%_0%,rgb(12_128_150/0.5),transparent),radial-gradient(70%_50%_at_100%_100%,rgb(255_112_72/0.16),transparent)]"
        />
        <p className="rise flex items-center gap-2.5 font-display text-2xl font-semibold tracking-tight">
          <span aria-hidden="true" className="grid grid-cols-2 gap-[3px]">
            <span className="size-[9px] rounded-[2px] bg-white/85" />
            <span className="size-[9px] rounded-[2px] bg-white/85" />
            <span className="size-[9px] rounded-[2px] bg-white/85" />
            <span className="size-[9px] rounded-[2px] bg-ember" />
          </span>
          AveryDay
        </p>
        {/* the chain is the brand's picture, not the task: on a phone the form comes first */}
        <div className="hidden flex-col gap-8 sm:flex">
          <ChainGrid />
          <p
            className="rise hidden max-w-sm font-display text-4xl leading-[1.1] font-semibold tracking-tight lg:block"
            style={{ '--i': 6 } as CSSProperties}
          >
            One square a day.
            <br />
            <span className="text-ember">Don’t break the chain.</span>
          </p>
        </div>
      </aside>
      <main className="flex items-center px-6 pt-10 pb-12 sm:py-12 lg:px-20">
        <div className="w-full max-w-sm">
          <h1 className="rise font-display text-4xl font-semibold tracking-tight" style={{ '--i': 0 } as CSSProperties}>
            {title}
          </h1>
          <p className="rise mt-2 text-ink-soft" style={{ '--i': 1 } as CSSProperties}>
            {intro}
          </p>
          <div className="mt-9">{children}</div>
          {/* a plain link: privacy.html is a static page, not a route of the app */}
          <p className="mt-10 text-sm text-ink-soft">
            <a href="/privacy.html" className="underline underline-offset-2 hover:text-ink">
              Privacy policy
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
