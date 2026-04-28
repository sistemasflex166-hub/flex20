import api from './client'

export type PartnerType = 'cliente' | 'fornecedor' | 'ambos'
export type PersonType = 'juridica' | 'fisica'

export interface Partner {
  id: number
  code: number
  company_id: number
  tenant_id: number
  partner_type: PartnerType
  person_type: PersonType
  name: string
  trade_name: string | null
  cnpj_cpf: string | null
  state_registration: string | null
  municipal_registration: string | null
  city: string | null
  state: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  conta_contabil_id: number | null
}

export interface PartnerCreate {
  partner_type: PartnerType
  person_type: PersonType
  name: string
  trade_name?: string
  cnpj_cpf?: string
  state_registration?: string
  municipal_registration?: string
  address?: string
  address_number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  zip_code?: string
  phone?: string
  email?: string
  conta_contabil_id?: number | null
}

export const partnersApi = {
  list: (companyId: number) =>
    api.get<Partner[]>('/partners/', { params: { company_id: companyId } }),

  create: (companyId: number, data: PartnerCreate) =>
    api.post<Partner>('/partners/', data, { params: { company_id: companyId } }),

  update: (companyId: number, id: number, data: Partial<PartnerCreate>) =>
    api.patch<Partner>(`/partners/${id}`, data, { params: { company_id: companyId } }),
}
