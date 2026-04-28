import api from './client'

export interface CompanyPartner {
  id: number
  company_id: number
  tenant_id: number
  name: string
  cpf: string | null
  rg: string | null
  rg_issuer: string | null
  birth_date: string | null
  phone: string | null
  email: string | null
  equity_share: number | null
  address: string | null
  address_number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  is_responsible: boolean
}

export interface CompanyPartnerCreate {
  name: string
  cpf?: string
  rg?: string
  rg_issuer?: string
  birth_date?: string
  phone?: string
  email?: string
  equity_share?: number
  address?: string
  address_number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  zip_code?: string
  is_responsible?: boolean
}

export const companyPartnersApi = {
  list: (companyId: number) =>
    api.get<CompanyPartner[]>('/company-partners/', { params: { company_id: companyId } }),

  create: (companyId: number, data: CompanyPartnerCreate) =>
    api.post<CompanyPartner>('/company-partners/', data, { params: { company_id: companyId } }),

  update: (id: number, companyId: number, data: Partial<CompanyPartnerCreate>) =>
    api.patch<CompanyPartner>(`/company-partners/${id}`, data, { params: { company_id: companyId } }),

  delete: (id: number, companyId: number) =>
    api.delete(`/company-partners/${id}`, { params: { company_id: companyId } }),
}
