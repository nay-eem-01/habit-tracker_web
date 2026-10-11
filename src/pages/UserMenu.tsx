import { Desktop, GearSix, Key, Moon, SignOut, Sun } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AuthUser } from '../api/client'
import { getTheme, setTheme, type Theme } from '../theme'

const THEMES = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'System', Icon: Desktop },
  { value: 'dark', label: 'Dark', Icon: Moon },
] as const

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2)
  return letters.toUpperCase()
}

/** The person's avatar; opens a small card with who is signed in and the way out. */
export function UserMenu({ user, onSignOut }: { user: AuthUser; onSignOut: () => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const [theme, setThemeState] = useState<Theme>(getTheme)

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
          className="pop absolute right-0 z-10 mt-2 w-64 rounded-2xl border border-mist bg-surface p-2 shadow-[0_18px_40px_-12px_rgb(9_38_52/0.28)]"
        >
          <div className="px-3 pt-2 pb-3">
            <p className="truncate font-display text-lg font-semibold tracking-tight">{user.name}</p>
            <p className="truncate text-sm text-ink-soft">{user.email}</p>
          </div>
          <div role="group" aria-label="Theme" className="mx-1 mb-2 flex gap-1 rounded-full bg-mist/45 p-1">
            {THEMES.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={theme === value}
                aria-label={label}
                title={label}
                onClick={() => {
                  setTheme(value)
                  setThemeState(value)
                }}
                className={`grid h-8 flex-1 place-items-center rounded-full transition-[background-color,color,transform] duration-200 ease-out active:scale-95 ${
                  theme === value ? 'bg-pill text-ink shadow-[0_1px_3px_rgb(0_0_0/0.18)]' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <Icon size={18} weight="bold" aria-hidden="true" />
              </button>
            ))}
          </div>
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 font-medium transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] [@media(hover:hover)]:hover:bg-chalk"
          >
            <GearSix size={20} weight="bold" aria-hidden="true" />
            Settings
          </Link>
          <Link
            to="/account/password"
            onClick={() => setOpen(false)}
            className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 font-medium transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] [@media(hover:hover)]:hover:bg-chalk"
          >
            <Key size={20} weight="bold" aria-hidden="true" />
            Change password
          </Link>
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
