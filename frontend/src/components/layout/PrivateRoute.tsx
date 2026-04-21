import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types/auth'

interface Props {
  allowedRoles?: UserRole[]
}

export function PrivateRoute({ allowedRoles }: Props) {
  const { user, isLoading } = useAuth()

  if (isLoading) return <div className="flex h-screen items-center justify-center">Carregando...</div>
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />

  return <Outlet />
}
