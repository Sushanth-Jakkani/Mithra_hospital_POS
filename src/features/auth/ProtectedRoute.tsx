import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: UserRole[]
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && profile && !roles.includes(profile.role) && profile.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
