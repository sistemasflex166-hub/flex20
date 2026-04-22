import api from './client'

export interface Product {
  id: number
  company_id: number
  code: string
  name: string
  ncm: string | null
  unit: string
  price: number | null
  is_active: boolean
}

export interface ProductCreate {
  code: string
  name: string
  ncm?: string
  unit?: string
  price?: number
}

export interface ServiceItem {
  id: number
  company_id: number
  code: string
  name: string
  service_code: string | null
  cnae: string | null
  iss_rate: number | null
  simples_anexo: string | null
  pis_rate: number | null
  cofins_rate: number | null
  account_code: string | null
  is_active: boolean
}

export interface ServiceItemCreate {
  code: string
  name: string
  service_code?: string
  cnae?: string
  iss_rate?: number
  simples_anexo?: string
  pis_rate?: number
  cofins_rate?: number
  account_code?: string
}

export interface CFOP {
  id: number
  code: string
  description: string
  is_input: boolean
  is_active: boolean
}

export interface CFOPCreate {
  code: string
  description: string
  is_input: boolean
}

export interface OperationNature {
  id: number
  company_id: number
  code: string
  name: string
  cfop_id: number | null
  simples_anexo: string | null
  pis_rate: number | null
  cofins_rate: number | null
  account_code: string | null
  is_billing: boolean
  is_active: boolean
}

export interface OperationNatureCreate {
  code: string
  name: string
  cfop_id?: number
  simples_anexo?: string
  pis_rate?: number
  cofins_rate?: number
  account_code?: string
  is_billing?: boolean
}

export type ProductUpdate = Partial<ProductCreate>
export type ServiceItemUpdate = Partial<ServiceItemCreate>
export type CFOPUpdate = Partial<CFOPCreate>
export type OperationNatureUpdate = Partial<OperationNatureCreate>

export const productsApi = {
  list: (companyId: number) =>
    api.get<Product[]>('/fiscal-base/products/', { params: { company_id: companyId } }),
  create: (companyId: number, data: ProductCreate) =>
    api.post<Product>('/fiscal-base/products/', data, { params: { company_id: companyId } }),
  update: (id: number, companyId: number, data: ProductUpdate) =>
    api.patch<Product>(`/fiscal-base/products/${id}`, data, { params: { company_id: companyId } }),
  deactivate: (id: number, companyId: number) =>
    api.patch<Product>(`/fiscal-base/products/${id}/deactivate`, {}, { params: { company_id: companyId } }),
}

export const serviceItemsApi = {
  list: (companyId: number) =>
    api.get<ServiceItem[]>('/fiscal-base/service-items/', { params: { company_id: companyId } }),
  create: (companyId: number, data: ServiceItemCreate) =>
    api.post<ServiceItem>('/fiscal-base/service-items/', data, { params: { company_id: companyId } }),
  update: (id: number, companyId: number, data: ServiceItemUpdate) =>
    api.patch<ServiceItem>(`/fiscal-base/service-items/${id}`, data, { params: { company_id: companyId } }),
  deactivate: (id: number, companyId: number) =>
    api.patch<ServiceItem>(`/fiscal-base/service-items/${id}/deactivate`, {}, { params: { company_id: companyId } }),
}

export const cfopsApi = {
  list: (tenantId?: number) =>
    api.get<CFOP[]>('/fiscal-base/cfops/', { params: tenantId ? { tenant_id: tenantId } : {} }),
  create: (data: CFOPCreate, tenantId?: number) =>
    api.post<CFOP>('/fiscal-base/cfops/', data, { params: tenantId ? { tenant_id: tenantId } : {} }),
  update: (id: number, data: CFOPUpdate, tenantId?: number) =>
    api.patch<CFOP>(`/fiscal-base/cfops/${id}`, data, { params: tenantId ? { tenant_id: tenantId } : {} }),
  deactivate: (id: number, tenantId?: number) =>
    api.patch<CFOP>(`/fiscal-base/cfops/${id}/deactivate`, {}, { params: tenantId ? { tenant_id: tenantId } : {} }),
}

export const operationNaturesApi = {
  list: (companyId: number) =>
    api.get<OperationNature[]>('/fiscal-base/operation-natures/', { params: { company_id: companyId } }),
  create: (companyId: number, data: OperationNatureCreate) =>
    api.post<OperationNature>('/fiscal-base/operation-natures/', data, { params: { company_id: companyId } }),
  update: (id: number, companyId: number, data: OperationNatureUpdate) =>
    api.patch<OperationNature>(`/fiscal-base/operation-natures/${id}`, data, { params: { company_id: companyId } }),
  deactivate: (id: number, companyId: number) =>
    api.patch<OperationNature>(`/fiscal-base/operation-natures/${id}/deactivate`, {}, { params: { company_id: companyId } }),
}
