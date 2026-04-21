import { useQuery } from '@tanstack/react-query'
import { companiesApi, type Company } from '@/api/companies'
import { useAuth } from '@/contexts/AuthContext'

interface Props {
  value: number | null
  onChange: (company: Company | null) => void
}

export function CompanySelector({ value, onChange }: Props) {
  const { user } = useAuth()
  const tenantId = user?.role === 'platform_admin' ? 1 : undefined

  const { data: companies = [] } = useQuery({
    queryKey: ['companies', tenantId],
    queryFn: () => companiesApi.list(tenantId).then((r) => r.data),
  })

  return (
    <div className="mb-5 flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Empresa:</label>
      <select
        className="input max-w-xs"
        value={value ?? ''}
        onChange={(e) => {
          const id = Number(e.target.value)
          onChange(companies.find((c) => c.id === id) ?? null)
        }}
      >
        <option value="">Selecione uma empresa...</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {String(c.code).padStart(4, '0')} — {c.name}
          </option>
        ))}
      </select>
    </div>
  )
}
