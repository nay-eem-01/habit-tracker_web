export type Theme = 'system' | 'light' | 'dark'

const KEY = 'devhabit-theme'

export function getTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

/** "system" drops the attribute so the OS preference decides; the other two pin it. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}

export function setTheme(theme: Theme): void {
  applyTheme(theme)
  try {
    if (theme === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, theme)
  } catch {
    // storage blocked: the choice still applies until the page is closed
  }
}
