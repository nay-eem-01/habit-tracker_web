import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { googleSignIn } from '../api/auth'
import { authErrorMessage } from '../api/messages'
import { useAuth } from '../auth/context'

/** Empty hides the button: Google sign-in needs this app's client id. */
const CLIENT_ID: string | undefined = import.meta.env?.VITE_GOOGLE_CLIENT_ID

interface GoogleId {
  initialize(config: { client_id: string; callback: (response: { credential: string }) => void }): void
  renderButton(parent: HTMLElement, options: Record<string, string | number>): void
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
  }
}

let script: Promise<GoogleId> | null = null

/** Google Identity Services, loaded once and only on the pages that show the button. */
function loadGoogle(): Promise<GoogleId> {
  script ??= new Promise((resolve, reject) => {
    const tag = document.createElement('script')
    tag.src = 'https://accounts.google.com/gsi/client'
    tag.async = true
    tag.onload = () => (window.google ? resolve(window.google.accounts.id) : reject(new Error('Google sign-in did not load')))
    tag.onerror = () => {
      script = null
      reject(new Error('Google sign-in did not load'))
    }
    document.head.appendChild(tag)
  })
  return script
}

/** "Continue with Google" under the email form; signs in or creates the account. */
export function GoogleButton() {
  const { signIn } = useAuth()
  const slot = useRef<HTMLDivElement>(null)
  const mutation = useMutation({
    mutationFn: (idToken: string) => googleSignIn(idToken, Intl.DateTimeFormat().resolvedOptions().timeZone),
    onSuccess: signIn,
  })
  const { mutate } = mutation

  useEffect(() => {
    if (!CLIENT_ID) return
    let live = true
    loadGoogle()
      .then((google) => {
        if (!live || !slot.current) return
        google.initialize({ client_id: CLIENT_ID, callback: ({ credential }) => mutate(credential) })
        const theme = document.documentElement.dataset.theme
        const systemDark = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
        const dark = theme === 'dark' || (!theme && systemDark)
        // Google draws its own button; it takes a pixel width of 200–400
        google.renderButton(slot.current, {
          theme: dark ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: Math.min(400, Math.max(200, slot.current.offsetWidth)),
        })
      })
      .catch(() => {
        // blocked or offline: the email form still works, so the button just doesn't appear
      })
    return () => {
      live = false
    }
  }, [mutate])

  if (!CLIENT_ID) return null
  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 text-sm text-ink-soft" aria-hidden="true">
        <span className="h-px flex-1 bg-mist" />
        or
        <span className="h-px flex-1 bg-mist" />
      </div>
      {/* Google's iframe is light; on a dark page a mismatched color-scheme makes the browser paint it an opaque white box */}
      <div ref={slot} className="mt-6 flex min-h-11 justify-center [color-scheme:light]" />
      {mutation.isPending && (
        <p role="status" className="mt-2 text-center text-sm text-ink-soft">
          Signing in with Google…
        </p>
      )}
      {mutation.isError && (
        <p role="alert" className="mt-2 text-sm text-alert">
          {authErrorMessage(mutation.error)}
        </p>
      )}
    </div>
  )
}
