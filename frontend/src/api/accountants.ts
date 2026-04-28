import api from './client'

export interface Accountant {
  id: number
  tenant_id: number
  name: string
  cpf: string | null
  crc: string | null
  phone: string | null
  email: string | null
  is_active: boolean
}

export interface AccountantCreate {
  name: string
  cpf?: string
  crc?: string
  phone?: string
  email?: string
}

export const accountantsApi = {
  list: (tenantId?: number) => api.get<Accountant[]>('/accountants/', { params: tenantId ? { tenant_id: tenantId } : {} }),
  create: (data: AccountantCreate, tenantId?: number) => api.post<Accountant>('/accountants/', data, { params: tenantId ? { tenant_id: tenantId } : {} }),
  update: (id: number, data: Partial<AccountantCreate>, tenantId?: number) => api.patch<Accountant>(`/accountants/${id}`, data, { params: tenantId ? { tenant_id: tenantId } : {} }),
  delete: (id: number, tenantId?: number) => api.delete(`/accountants/${id}`, { params: tenantId ? { tenant_id: tenantId } : {} }),
}
