import { api } from '../api/client'

interface PushKey {
  /** False: the server isn't sending pushes, so don't offer them. */
  enabled: boolean
  /** applicationServerKey, base64url. */
  publicKey: string
}

export interface PushState {
  supported: boolean
  enabled: boolean
  publicKey: string
  subscribed: boolean
  permission: NotificationPermission
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** base64url → bytes, the form pushManager.subscribe() takes the key in. */
export function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(base64url.length / 4) * 4, '=')
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

/** This browser's subscription, if any. `getRegistration`, not `ready`: ready never settles without a worker. */
async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration()
  return (await registration?.pushManager.getSubscription()) ?? null
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return { supported: false, enabled: false, publicKey: '', subscribed: false, permission: 'default' }
  const key = await api<PushKey>('/api/push/public-key')
  const subscription = await currentSubscription()
  return { supported: true, ...key, subscribed: subscription != null, permission: Notification.permission }
}

/** Asks for permission, subscribes this browser and tells the server. False when the user says no. */
export async function enablePush(publicKey: string): Promise<boolean> {
  if ((await Notification.requestPermission()) !== 'granted') return false
  await navigator.serviceWorker.register('/sw.js')
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) })
  await api('/api/push/subscriptions', { method: 'POST', body: subscription.toJSON() })
  return true
}

/** Stops pushes to this browser: the server forgets it, then the browser drops it. */
export async function disablePush(): Promise<void> {
  const subscription = await currentSubscription()
  if (!subscription) return
  try {
    await api('/api/push/subscriptions', { method: 'DELETE', body: { endpoint: subscription.endpoint } })
  } finally {
    await subscription.unsubscribe()
  }
}
