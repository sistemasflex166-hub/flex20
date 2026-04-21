import { useQuery } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { companiesApi } from '@/api/companies'
import { useAuth } from '@/contexts/AuthContext'
import { useCompany } from '@/contexts/CompanyContext'

export function CompanyHeader() {
  const { user } = useAuth()
  const { company, setCompany } = useCompany()
  const tenantId = user?.role === 'platform_admin' ? 1 : undefined

  const { data: companies = [] } = useQuery({
    queryKey: ['companies', tenantId],
    queryFn: () => companiesApi.list(tenantId).then((r) => r.data),
  })

  return (
    <div className="flex h-12 items-center gap-3 border-b border-gray-200 bg-white px-6">
      <Building2 size={15} className="text-gray-400 shrink-0" />
      <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Empresa:</span>
      <select
        className="h-7 max-w-xs flex-1 rounded-md border border-gray-200 bg-gray-50 px-2 text-xs text-gray-700 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
        value={company?.id ?? ''}
        onChange={(e) => {
          const id = Number(e.target.value)
          setCompany(companies.find((c) => c.id === id) ?? null)
        }}
      >
        <option value="">— Selecione uma empresa —</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {String(c.code).padStart(4, '0')} — {c.name}
          </option>
        ))}
      </select>
      {company && (
        <span className="ml-2 text-xs text-gray-400 truncate hidden sm:block">
          {company.regime === 'simples_nacional' ? 'Simples Nacional'
            : company.regime === 'lucro_presumido' ? 'Lucro Presumido'
            : company.regime === 'lucro_real' ? 'Lucro Real'
            : company.regime.toUpperCase()}
        </span>
      )}
    </div>
  )
}
