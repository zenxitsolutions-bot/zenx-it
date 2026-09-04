import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/common/Logo.jsx'
import useAuth from '../hooks/useAuth.js'

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  CUSTOMER_ADMIN: 'Customer Admin',
  DIETITIAN: 'Dietitian',
  TRAINER: 'Trainer',
  STAFF: 'Staff',
  CLIENT: 'Client',
  MEMBER: 'Member',
}

export function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    document.title = 'Dashboard · ZenX Wellness'
  }, [])

  const handleLogout = async () => {
    setSigningOut(true)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Logo />
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 disabled:opacity-60"
          >
            {signingOut ? 'Signing out...' : 'Logout'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-7 shadow-sm sm:p-9">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            ZenX Admin Dashboard
          </h1>
          <p className="mt-2 text-slate-600">Welcome, {user?.firstName}</p>
          <p className="mt-1 text-sm text-slate-500">
            Role: <span className="font-medium text-brand-700">{ROLE_LABELS[user?.role] || user?.role}</span>
          </p>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
