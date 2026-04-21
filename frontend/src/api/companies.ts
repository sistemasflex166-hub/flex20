import api from './client'

export interface Company {
  id: number
  code: number
  tenant_id: number
  name: string
  trade_name: string | null
  cnpj: string | null
  cpf: string | null
  company_type: string
  regime: string
  city: string | null
  state: string | null
  phone: string | null
  email: string | null
  is_active: boolean
}

export interface CompanyCreate {
  name: string
  trade_name?: string
  cnpj?: string
  cpf?: string
  state_registration?: string
  municipal_registration?: string
  company_type: string
  regime: string
  address?: string
  address_number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  zip_code?: string
  phone?: string
  email?: string
}

// tenant_id só é necessário quando o usuário logado é platform_admin
export const companiesApi = {
  list: (tenantId?: number, includeInactive = false) =>
    api.get<Company[]>('/companies/', { params: { include_inactive: includeInactive, ...(tenantId && { tenant_id: tenantId }) } }),

  get: (id: number, tenantId?: number) =>
    api.get<Company>(`/companies/${id}`, { params: tenantId ? { tenant_id: tenantId } : {} }),

  create: (data: CompanyCreate, tenantId?: number) =>
    api.post<Company>('/companies/', data, { params: tenantId ? { tenant_id: tenantId } : {} }),

  update: (id: number, data: Partial<CompanyCreate>, tenantId?: number) =>
    api.patch<Company>(`/companies/${id}`, data, { params: tenantId ? { tenant_id: tenantId } : {} }),

  deactivate: (id: number, tenantId?: number) =>
    api.patch<Company>(`/companies/${id}/deactivate`, {}, { params: tenantId ? { tenant_id: tenantId } : {} }),
}
