import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Settings, FileText, BookOpen, Users, Package,
  Building2, ChevronDown, ChevronRight, LogOut
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface MenuItem {
  label: string
  icon: React.ReactNode
  path?: string
  children?: { label: string; path: string }[]
}

const menuItems: MenuItem[] = [
  {
    label: 'Configurações',
    icon: <Settings size={18} />,
    children: [
      { label: 'Empresas', path: '/configuracoes/empresas' },
    ],
  },
  {
    label: 'Escrita Fiscal',
    icon: <FileText size={18} />,
    children: [
      { label: 'Lançamentos', path: '/fiscal/lancamentos' },
      { label: 'Clientes e Fornecedores', path: '/fiscal/clientes-fornecedores' },
      { label: 'Produtos', path: '/fiscal/produtos' },
      { label: 'Serviços', path: '/fiscal/servicos' },
      { label: 'CFOPs', path: '/fiscal/cfops' },
      { label: 'Natureza de Operação', path: '/fiscal/natureza-operacao' },
      { label: 'Importar NF-e', path: '/fiscal/importar-nfe' },
      { label: 'Mapeamento CFOP', path: '/fiscal/mapeamento-cfop' },
    ],
  },
  {
    label: 'Contabilidade',
    icon: <BookOpen size={18} />,
    children: [
      { label: 'Plano de Contas', path: '/contabilidade/plano-contas' },
      { label: 'Lançamentos', path: '/contabilidade/lancamentos' },
    ],
  },
  {
    label: 'Folha de Pagamentos',
    icon: <Users size={18} />,
    children: [
      { label: 'Funcionários', path: '/folha/funcionarios' },
    ],
  },
  {
    label: 'Patrimônio',
    icon: <Package size={18} />,
    path: '/patrimonio',
  },
  {
    label: 'Gerenciador',
    icon: <Building2 size={18} />,
    path: '/gerenciador',
  },
]

export function Sidebar() {
  const { user, logout } = useAuth()
  const [expanded, setExpanded] = useState<string[]>(['Escrita Fiscal'])

  const toggle = (label: string) => {
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-5 py-4">
        <span className="text-lg font-semibold text-brand-700">Flex 2.0</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {menuItems.map((item) => (
          <div key={item.label} className="mb-1">
            {item.path ? (
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ) : (
              <>
                <button
                  onClick={() => toggle(item.label)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  {expanded.includes(item.label) ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>
                {expanded.includes(item.label) && item.children && (
                  <div className="ml-7 mt-0.5 space-y-0.5">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          `block rounded-lg px-3 py-1.5 text-sm transition-colors ${
                            isActive
                              ? 'bg-brand-50 font-medium text-brand-700'
                              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                          }`
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-200 px-4 py-3">
        <p className="truncate text-xs font-medium text-gray-700">{user?.full_name}</p>
        <p className="truncate text-xs text-gray-400">{user?.email}</p>
        <button
          onClick={logout}
          className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700"
        >
          <LogOut size={13} />
          Sair
        </button>
      </div>
    </aside>
  )
}
