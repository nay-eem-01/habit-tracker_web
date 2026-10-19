import { Outlet } from 'react-router-dom'
import { PAGE_WIDE } from '../components/styles'

/** The page frame for the admin screens (change password brings its own). */
export default function AdminPage() {
  return (
    <main className={PAGE_WIDE}>
      <Outlet />
    </main>
  )
}
