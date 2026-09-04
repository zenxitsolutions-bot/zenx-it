import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import LoginForm from '../components/auth/LoginForm.jsx'
import useAuth from '../hooks/useAuth.js'
import FullPageLoader from '../components/common/FullPageLoader.jsx'

export function Login() {
  const { isAuthenticated, initialising } = useAuth()

  useEffect(() => {
    document.title = 'Sign in · ZenX Wellness'
  }, [])

  if (initialising) return <FullPageLoader />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to manage your ZenX platform">
      <LoginForm />
    </AuthLayout>
  )
}

export default Login
