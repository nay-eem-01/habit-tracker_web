import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { GuestOnly, RequireAuth } from './auth/guards'
import AppLayout from './pages/AppLayout'

/** Each page is its own chunk, fetched the first time it's opened; the app frame loads with the first. */
const DashboardPage = lazy(() => import('./dashboard/DashboardPage'))
const GoalDetailPage = lazy(() => import('./goals/GoalDetailPage'))
const GoalFormPage = lazy(() => import('./goals/GoalFormPage'))
const GoalsPage = lazy(() => import('./goals/GoalsPage'))
const HabitDetailPage = lazy(() => import('./habits/HabitDetailPage'))
const HabitFormPage = lazy(() => import('./habits/HabitFormPage'))
const HabitsPage = lazy(() => import('./habits/HabitsPage'))
const LibraryPage = lazy(() => import('./resources/LibraryPage'))
const ResourceFormPage = lazy(() => import('./resources/ResourceFormPage'))
const TodayPage = lazy(() => import('./today/TodayPage'))
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const SignInPage = lazy(() => import('./pages/SignInPage'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'))

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <Routes>
          <Route element={<GuestOnly />}>
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          {/* open signed in or out: emailed links can be opened anywhere, and signed-in users can ask for one */}
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="/today" element={<TodayPage />} />
              <Route path="/habits" element={<HabitsPage />} />
              <Route path="/habits/new" element={<HabitFormPage />} />
              <Route path="/habits/:id" element={<HabitDetailPage />} />
              <Route path="/habits/:id/edit" element={<HabitFormPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/goals/new" element={<GoalFormPage />} />
              <Route path="/goals/:id" element={<GoalDetailPage />} />
              <Route path="/goals/:id/edit" element={<GoalFormPage />} />
              <Route path="/resources" element={<LibraryPage />} />
              <Route path="/resources/new" element={<ResourceFormPage />} />
              <Route path="/resources/:id/edit" element={<ResourceFormPage />} />
              <Route path="/account/password" element={<ChangePasswordPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}
