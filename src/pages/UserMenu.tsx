import { SignOut } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { AuthUser } from '../api/client'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2)
  return letters.toUpperCase()
}

/** The person's avatar; opens a small card with who is signed in and the way out. */
export function UserMenu({ user, onSignOut }: { user: AuthUser; onSignOut: () => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    const onClick = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="user-menu"
        aria-label={`Account, ${user.name}`}
        onClick={() => setOpen(!open)}
        className="grid size-10 place-items-center rounded-full bg-lapis text-sm font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] transition-transform duration-150 ease-out active:scale-95"
      >
        {initials(user.name)}
      </button>
      {open && (
        <section
          id="user-menu"
          aria-label="Account"
          className="pop absolute right-0 z-10 mt-2 w-64 rounded-2xl border border-mist bg-white p-2 shadow-[0_18px_40px_-12px_rgb(29_36_51/0.28)]"
        >
          <div className="px-3 pt-2 pb-3">
            <p className="truncate font-display text-lg font-semibold tracking-tight">{user.name}</p>
            <p className="truncate text-sm text-ink-soft">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left font-medium transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] [@media(hover:hover)]:hover:bg-chalk"
          >
            <SignOut size={20} weight="bold" aria-hidden="true" />
            Sign out
          </button>
        </section>
      )}
    </div>
  )
}
