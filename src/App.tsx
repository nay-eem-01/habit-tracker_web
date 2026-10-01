import { Route, Routes } from 'react-router-dom'

function Home() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">DevHabit</h1>
      <p className="mt-2 text-slate-600">Scaffold is up. Sign in and habits come next.</p>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  )
}
