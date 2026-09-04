import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import FullPageLoader from './FullPageLoader.jsx'

export function ProtectedRoute({ children }) {
  const { isAuthenticated, initialising } = useAuth()
  const location = useLocation()

  if (initialising) return <FullPageLoader />

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return children
}

export default ProtectedRoute
