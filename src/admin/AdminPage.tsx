import { Outlet } from 'react-router-dom'

/** The page frame for the admin screens (change password brings its own). */
export default function AdminPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-2 sm:px-6 sm:py-4">
      <Outlet />
    </main>
  )
}
