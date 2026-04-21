import { useAuth } from '@/contexts/AuthContext'

export function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <button
            onClick={logout}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Sair
          </button>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-gray-600">Bem-vindo, <strong>{user?.full_name}</strong></p>
          <p className="mt-1 text-sm text-gray-400">Perfil: {user?.role}</p>
        </div>
      </div>
    </div>
  )
}
