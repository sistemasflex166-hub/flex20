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
  list: () => api.get<Accountant[]>('/accountants/'),
  create: (data: AccountantCreate) => api.post<Accountant>('/accountants/', data),
  update: (id: number, data: Partial<AccountantCreate>) => api.patch<Accountant>(`/accountants/${id}`, data),
  delete: (id: number) => api.delete(`/accountants/${id}`),
}
