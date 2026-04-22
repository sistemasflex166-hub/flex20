import api from './client'

export interface NFePreviewItem {
  n_item: number
  description: string
  ncm: string | null
  cfop: string
  quantity: string
  unit: string
  unit_price: string
  total_net: string
}

export interface NFePreviewTotais {
  v_prod: string
  v_desc: string
  v_nf: string
  v_icms: string
  v_pis: string
  v_cofins: string
}

export interface NFePreview {
  chave: string
  numero: string
  serie: string
  nat_op: string
  dh_emi: string
  tp_amb: string
  is_purchase: boolean
  emit: { cnpj: string | null; nome: string; uf: string | null }
  dest: { cnpj_cpf: string | null; nome: string; uf: string | null }
  company_id: number | null
  company_name: string | null
  cnpj_not_found: boolean
  cnpj_in_file: string
  already_imported: boolean
  existing_entry_id: number | null
  unmapped_cfops: string[]
  totais: NFePreviewTotais
  itens: NFePreviewItem[]
}

export interface NFeImportResult {
  id: number
  code: number
  entry_type: string
  document_number: string
  document_series: string
  partner_name: string
  total_gross: number
  items_count: number
}

export interface CfopMapping {
  id: number
  tenant_id: number
  company_id: number | null
  cfop_origin: string
  cfop_destination: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CfopMappingCreate {
  cfop_origin: string
  cfop_destination: string
  company_id?: number | null
  description?: string | null
}

export async function previewNfe(file: File, tenantId?: number): Promise<NFePreview> {
  const form = new FormData()
  form.append('file', file)
  const params = tenantId ? { tenant_id: tenantId } : {}
  const { data } = await api.post('/nfe/preview', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params,
  })
  return data
}

export async function importNfe(
  file: File,
  onDuplicate: 'skip' | 'overwrite',
  tenantId?: number
): Promise<NFeImportResult> {
  const form = new FormData()
  form.append('file', file)
  const params: Record<string, any> = { on_duplicate: onDuplicate }
  if (tenantId) params.tenant_id = tenantId
  const { data } = await api.post('/nfe/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params,
  })
  return data
}

export async function listCfopMappings(companyId?: number, tenantId?: number): Promise<CfopMapping[]> {
  const params: Record<string, any> = {}
  if (companyId) params.company_id = companyId
  if (tenantId) params.tenant_id = tenantId
  const { data } = await api.get('/nfe/cfop-mappings', { params })
  return data
}

export async function createCfopMapping(body: CfopMappingCreate, tenantId?: number): Promise<CfopMapping> {
  const params = tenantId ? { tenant_id: tenantId } : {}
  const { data } = await api.post('/nfe/cfop-mappings', body, { params })
  return data
}

export async function updateCfopMapping(
  id: number,
  body: Partial<CfopMappingCreate & { is_active: boolean }>,
  tenantId?: number
): Promise<CfopMapping> {
  const params = tenantId ? { tenant_id: tenantId } : {}
  const { data } = await api.patch(`/nfe/cfop-mappings/${id}`, body, { params })
  return data
}

export async function deleteCfopMapping(id: number, tenantId?: number): Promise<void> {
  const params = tenantId ? { tenant_id: tenantId } : {}
  await api.delete(`/nfe/cfop-mappings/${id}`, { params })
}
