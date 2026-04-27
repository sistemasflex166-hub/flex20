import api from './client'

export type EntryType = 'purchase' | 'sale' | 'service_provided' | 'service_taken' | 'transport' | 'other'

export interface FiscalEntryItem {
  id: number
  entry_id: number
  description: string
  ncm: string | null
  cfop_id: number | null
  product_id: number | null
  service_item_id: number | null
  quantity: number
  unit: string
  unit_price: number
  discount: number
  total: number
  icms_cst: string | null
  icms_base: number
  icms_rate: number
  icms_value: number
  pis_cst: string | null
  pis_rate: number
  pis_value: number
  cofins_cst: string | null
  cofins_rate: number
  cofins_value: number
}

export interface FiscalEntry {
  id: number
  code: number
  company_id: number
  tenant_id: number
  entry_type: EntryType
  entry_date: string
  competence_date: string
  document_number: string | null
  document_series: string | null
  document_model: string | null
  partner_id: number | null
  partner_name: string | null
  partner_cnpj_cpf: string | null
  cfop_id: number | null
  operation_nature_id: number | null
  total_products: number
  total_services: number
  total_discount: number
  total_other: number
  total_gross: number
  icms_base: number
  icms_value: number
  pis_value: number
  cofins_value: number
  iss_value: number
  ibs_value: number
  cbs_value: number
  access_key: string | null
  notes: string | null
  is_active: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
  items: FiscalEntryItem[]
}

export interface FiscalEntryCreate {
  company_id: number
  entry_type: EntryType
  entry_date: string
  competence_date: string
  document_number?: string
  document_series?: string
  document_model?: string
  partner_id?: number
  partner_name?: string
  partner_cnpj_cpf?: string
  cfop_id?: number
  operation_nature_id?: number
  total_products?: number
  total_services?: number
  total_discount?: number
  total_other?: number
  total_gross?: number
  icms_base?: number
  icms_value?: number
  pis_value?: number
  cofins_value?: number
  iss_value?: number
  ibs_value?: number
  cbs_value?: number
  access_key?: string
  notes?: string
  items?: Omit<FiscalEntryItem, 'id' | 'entry_id'>[]
}

export const fiscalEntriesApi = {
  list: (params: { company_id?: number; entry_type?: string; include_inactive?: boolean; tenant_id?: number }) =>
    api.get<FiscalEntry[]>('/fiscal-entries/', { params }),

  get: (id: number, tenantId?: number) =>
    api.get<FiscalEntry>(`/fiscal-entries/${id}`, { params: tenantId ? { tenant_id: tenantId } : {} }),

  create: (data: FiscalEntryCreate, tenantId?: number) =>
    api.post<FiscalEntry>('/fiscal-entries/', data, { params: tenantId ? { tenant_id: tenantId } : {} }),

  update: (id: number, data: Partial<FiscalEntryCreate>, tenantId?: number) =>
    api.patch<FiscalEntry>(`/fiscal-entries/${id}`, data, { params: tenantId ? { tenant_id: tenantId } : {} }),

  softDelete: (id: number, tenantId?: number) =>
    api.patch<FiscalEntry>(`/fiscal-entries/${id}/delete`, {}, { params: tenantId ? { tenant_id: tenantId } : {} }),

  restore: (id: number, tenantId?: number) =>
    api.patch<FiscalEntry>(`/fiscal-entries/${id}/restore`, {}, { params: tenantId ? { tenant_id: tenantId } : {} }),

  hardDelete: (id: number, tenantId?: number) =>
    api.delete(`/fiscal-entries/${id}`, { params: tenantId ? { tenant_id: tenantId } : {} }),
}
