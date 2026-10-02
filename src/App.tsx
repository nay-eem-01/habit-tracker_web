import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { GuestOnly, RequireAuth } from './auth/guards'
import HabitDetailPage from './habits/HabitDetailPage'
import HabitFormPage from './habits/HabitFormPage'
import HabitsPage from './habits/HabitsPage'
import TodayPage from './today/TodayPage'
import AppLayout from './pages/AppLayout'
import RegisterPage from './pages/RegisterPage'
import SignInPage from './pages/SignInPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<TodayPage />} />
            <Route path="/habits" element={<HabitsPage />} />
            <Route path="/habits/new" element={<HabitFormPage />} />
            <Route path="/habits/:id" element={<HabitDetailPage />} />
            <Route path="/habits/:id/edit" element={<HabitFormPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
